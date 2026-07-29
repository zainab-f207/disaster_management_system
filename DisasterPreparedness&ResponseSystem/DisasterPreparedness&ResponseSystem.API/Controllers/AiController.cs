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
            var apiKey = _config["ClaudeApiKey"] 
                         ?? _config["CLAUDE_API_KEY"] 
                         ?? _config["Claude_Api_Key"]
                         ?? Environment.GetEnvironmentVariable("ClaudeApiKey")
                         ?? Environment.GetEnvironmentVariable("CLAUDE_API_KEY");
            
            if (string.IsNullOrEmpty(apiKey))
            {
                await Task.Delay(1500); 
                return Ok(new { 
                    content = new[] { 
                        new { text = "⚠️ **[Mock Mode]** I am the Nigehbaan AI assistant. (Claude API Key is not configured in the backend).\n\nCall **1122** if this is a real emergency!" } 
                    }
                });
            }

            var claudeMessages = request.Messages.Select(m => new
            {
                role = m.Role == "assistant" ? "assistant" : "user",
                content = m.Content
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

            var modelName = _config["ClaudeModel"] ?? "claude-3-5-sonnet-20241022";

            var payload = new
            {
                model = modelName,
                max_tokens = 1024,
                system = systemPrompt,
                messages = claudeMessages
            };

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            requestMessage.Headers.Add("x-api-key", apiKey);
            requestMessage.Headers.Add("anthropic-version", "2023-06-01");

            var jsonPayload = JsonSerializer.Serialize(payload);
            requestMessage.Content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(requestMessage);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Claude API call failed with HTTP status code {StatusCode}: {ErrorResponse}", response.StatusCode, error);
                return StatusCode((int)response.StatusCode, new { error });
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;
            string? replyText = null;
            
            if (root.TryGetProperty("content", out var contentProp) && 
                contentProp.ValueKind == JsonValueKind.Array &&
                contentProp.GetArrayLength() > 0)
            {
                var firstContent = contentProp[0];
                if (firstContent.TryGetProperty("text", out var textProp))
                {
                    replyText = textProp.GetString();
                }
            }

            if (string.IsNullOrEmpty(replyText))
            {
                replyText = "I could not generate a response. Please call 1122 immediately.";
            }

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
