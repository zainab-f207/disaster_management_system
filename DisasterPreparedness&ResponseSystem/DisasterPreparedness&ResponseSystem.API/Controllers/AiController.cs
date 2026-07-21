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
            
            // If no API key is provided, return a mock response for now
            if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_API_KEY_HERE")
            {
                await Task.Delay(1500); // Simulate network delay
                return Ok(new { 
                    content = new[] { 
                        new { text = "⚠️ **[Mock Mode]** I am the Nigehbaan AI assistant. (Gemini API Key is not configured in the backend).\n\nCall **1122** if this is a real emergency!" } 
                    }
                });
            }

            // Map incoming messages to Gemini format (roles: user or model)
            var geminiContents = request.Messages.Select(m => new
            {
                role = m.Role == "assistant" ? "model" : "user",
                parts = new[]
                {
                    new { text = m.Content }
                }
            }).ToArray();

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

            var payload = new
            {
                contents = geminiContents,
                systemInstruction = new
                {
                    parts = new[]
                    {
                        new { text = systemPrompt }
                    }
                }
            };

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";
            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Gemini API call failed with HTTP status code {StatusCode}: {ErrorResponse}", response.StatusCode, error);
                return StatusCode((int)response.StatusCode, new { error });
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            
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

            if (string.IsNullOrEmpty(replyText))
            {
                replyText = "I could not generate a response. Please call 1122 immediately.";
            }

            // Return in the format the frontend expects (Anthropic style compatibility)
            var formattedResponse = new
            {
                content = new[]
                {
                    new { text = replyText }
                }
            };

            return Ok(formattedResponse);
        }
    }
}
