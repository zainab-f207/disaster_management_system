using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AiController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;

        public AiController(IConfiguration config)
        {
            _config = config;
            _httpClient = new HttpClient();
        }

        public class ChatRequest
        {
            public object[] Messages { get; set; } = Array.Empty<object>();
            public string? UserMessage { get; set; }
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            var apiKey = _config["AnthropicApiKey"];
            
            // If no API key is provided, return a mock response for now
            if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_API_KEY_HERE")
            {
                await Task.Delay(1500); // Simulate network delay
                return Ok(new { 
                    content = new[] { 
                        new { text = "⚠️ **[Mock Mode]** I am the AI assistant. (Anthropic API Key is not configured in the backend).\n\nCall **1122** if this is a real emergency!" } 
                    }
                });
            }

            var payload = new
            {
                model = "claude-3-sonnet-20240229",
                max_tokens = 600,
                system = @"You are Pakistan's Emergency Disaster Assistant. You help citizens during disasters and emergencies in Pakistan.
Rules:
1. Always respond in simple, clear English
2. Always include emergency numbers: 1122 (Rescue), 115 (Edhi), 1135 (NDMA), 15 (Police)
3. Give step-by-step guidance for immediate safety
4. Be brief and actionable — people are in stressful situations
5. Always end with ""Call 1122 immediately if this is life-threatening""
6. You know Pakistan's geography and disaster context
7. Mention relevant Pakistan organizations when appropriate
8. Keep responses under 200 words unless absolutely necessary

You are NOT a replacement for emergency services. Always direct people to call emergency numbers.",
                messages = request.Messages
            };

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            httpRequest.Headers.Add("x-api-key", apiKey);
            httpRequest.Headers.Add("anthropic-version", "2023-06-01");
            httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(httpRequest);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                return StatusCode((int)response.StatusCode, new { error });
            }

            var data = await response.Content.ReadAsStringAsync();
            return Content(data, "application/json");
        }
    }
}
