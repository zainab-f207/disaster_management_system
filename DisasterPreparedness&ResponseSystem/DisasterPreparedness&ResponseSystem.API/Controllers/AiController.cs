using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Linq;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class AiController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;
        private readonly Microsoft.Extensions.Logging.ILogger<AiController> _logger;

        public AiController(IConfiguration config, Microsoft.Extensions.Logging.ILogger<AiController> logger)
        {
            _config = config;
            _logger = logger;
            _httpClient = new HttpClient();
        }

        public class MessageItem
        {
            [JsonPropertyName("role")]
            public string Role { get; set; } = "";

            [JsonPropertyName("content")]
            public string Content { get; set; } = "";
        }

        public class ChatRequest
        {
            [JsonPropertyName("messages")]
            public MessageItem[] Messages { get; set; } = Array.Empty<MessageItem>();
            
            [JsonPropertyName("userMessage")]
            public string? UserMessage { get; set; }
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            var apiKey = _config["GeminiApiKey"]
                         ?? _config["GEMINI_API_KEY"]
                         ?? _config["Gemini_Api_Key"]
                         ?? Environment.GetEnvironmentVariable("GeminiApiKey")
                         ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

            if (string.IsNullOrEmpty(apiKey))
            {
                await Task.Delay(500);
                return Ok(new
                {
                    content = new[] { new { text = "⚠️ **[Mock Mode]** Gemini API Key is not configured on the server.\n\nCall **1122** if this is a real emergency!" } }
                });
            }

            var systemPrompt = @"You are Pakistan's Emergency Disaster Assistant inside the 'Nigehbaan' app (Pakistan's Guardian Network). You help citizens during disasters and emergencies in Pakistan.
Rules:
1. Always respond in simple, clear English or Urdu.
2. Always include emergency numbers: 1122 (Rescue), 115 (Edhi), 1135 (NDMA), 15 (Police).
3. Give step-by-step guidance for immediate safety.
4. Be brief and actionable — people are in stressful situations.
5. Always end with ""Call 1122 immediately if this is life-threatening.""
6. You know Pakistan's geography and disaster context.
7. Mention relevant Pakistan organizations when appropriate.
8. Keep responses under 200 words unless absolutely necessary.

You are NOT a replacement for emergency services. Always direct people to call emergency numbers.";

            var geminiContents = request.Messages.Select(m => new
            {
                role = m.Role == "assistant" ? "model" : "user",
                parts = new[] { new { text = m.Content } }
            }).ToArray();

            var payload = new
            {
                contents = geminiContents,
                systemInstruction = new { parts = new[] { new { text = systemPrompt } } }
            };

            // Use a known-good, current model id. Make it configurable so you
            // can swap models without redeploying.
            var model = _config["GeminiModel"] ?? "gemini-2.5-flash";
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            try
            {
                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(url, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    // Log the REAL reason server-side, but never bubble a raw
                    // error status back to the browser — that's what was causing
                    // the "403" to show up in devtools.
                    _logger.LogError(
                        "Gemini API call failed ({StatusCode}): {Body}",
                        response.StatusCode, responseBody);

                    var friendly = response.StatusCode == System.Net.HttpStatusCode.Forbidden
                        ? "AI assistant is temporarily unavailable (API key issue). "
                        : "AI assistant is temporarily unavailable. ";

                    return Ok(new
                    {
                        content = new[] { new { text = $"⚠️ {friendly}Please call **1122** (Rescue) or **115** (Edhi) directly for any real emergency." } }
                    });
                }

                using var doc = JsonDocument.Parse(responseBody);
                var root = doc.RootElement;
                string? replyText = null;

                if (root.TryGetProperty("candidates", out var candidates) &&
                    candidates.GetArrayLength() > 0 &&
                    candidates[0].TryGetProperty("content", out var geminiContent) &&
                    geminiContent.TryGetProperty("parts", out var parts) &&
                    parts.GetArrayLength() > 0)
                {
                    replyText = parts[0].GetProperty("text").GetString();
                }

                replyText ??= "I could not generate a response. Please call 1122 immediately.";

                return Ok(new { content = new[] { new { text = replyText } } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error calling Gemini API");
                return Ok(new
                {
                    content = new[] { new { text = "⚠️ Connection error reaching the AI assistant. Please call **1122** immediately if this is an emergency." } }
                });
            }
        }
    }
}
