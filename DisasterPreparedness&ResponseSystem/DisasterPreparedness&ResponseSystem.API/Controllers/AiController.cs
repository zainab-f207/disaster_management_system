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

        // Checked in this order — covers the common ways people set user-secrets/env vars.
        private string? ResolveApiKey()
        {
            return _config["GeminiApiKey"]
                ?? _config["GEMINI_API_KEY"]
                ?? _config["Gemini_Api_Key"]
                ?? _config["Gemini:ApiKey"]
                ?? _config["GeminiSettings:ApiKey"]
                ?? Environment.GetEnvironmentVariable("GeminiApiKey")
                ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            var apiKey = ResolveApiKey();

            if (string.IsNullOrEmpty(apiKey))
            {
                await Task.Delay(500);
                return Ok(new
                {
                    content = new[] { new { text = "⚠️ **[Mock Mode]** No Gemini API key was found on the server (checked GeminiApiKey / GEMINI_API_KEY / Gemini:ApiKey in config and env vars).\n\nSet it with: `dotnet user-secrets set \"GeminiApiKey\" \"your-key-here\"`\n\nCall **1122** if this is a real emergency!" } }
                });
            }

            var ragContext = @"
Here is the official disaster preparedness guidance (RAG Context) you MUST base your advice on:

[Earthquake]
Before: Secure heavy furniture to walls, Keep emergency kit ready, Identify safe spots (under sturdy tables, against inner walls), Know how to turn off gas/water/electricity, Practice Drop, Cover, Hold On.
During: DROP to hands and knees, COVER your head and neck under a table or against inner wall, HOLD ON until shaking stops. Do NOT run outside during shaking. Do NOT use elevators. If in a car, pull over away from buildings.
After: Check for injuries, Expect aftershocks, Do NOT use gas appliances (check for leaks), Listen to Radio Pakistan 630 AM. Call NDMA if trapped: 1135.
Emergency Number: 1122

[Flood]
Before: Move to higher ground if flood warning issued, Store important documents in waterproof bag, Prepare emergency kit with 3 days of supplies, Disconnect electrical appliances, Fill bathtubs with clean water.
During: Evacuate immediately if told to. Never walk through moving water. Never drive through flooded road. Stay tuned to Pakistan Meteorological Department. Move to highest floor (no basement). Call 1129 (PDMA) for evacuation assistance.
After: Do not enter floodwater. Check structural damage. Boil all water before drinking. Photograph all damage. Beware of snakes/insects.
Emergency Number: 1129

[Heatwave]
Before: Stock up on water/electrolytes, Identify cooling centres, Check on elderly, Prepare fans/wet towels.
During: Stay indoors between 10AM-4PM. Drink water every 30 mins even if not thirsty. Wear light clothing. Avoid strenuous activity outdoors. Apply sunscreen. Never leave children in parked cars.
After: Check on vulnerable people. If someone collapses: move to shade, cool with water, call 1122. Heat stroke signs (no sweating, confusion, fever) is an emergency!
Emergency Number: 1122

[Fire]
Before: Install smoke detectors, Keep fire extinguisher, Plan two escape routes, Practice fire drill, Never leave cooking unattended.
During: Get out immediately. Feel doors before opening. Stay low (smoke rises). Do NOT use elevators. Close doors behind you. Call 16 (Fire Brigade) once outside.
After: Do NOT re-enter building. Seek medical attention for burns/smoke inhalation. Contact NADRA for document replacement.
Emergency Number: 16

[Gas Explosion / Leak]
Before: Know gas shut-off valve, Never store flammable materials near gas appliances, Have gas lines inspected.
During: Do NOT turn on/off light switches. Do NOT use phone or create spark inside. Open windows/doors as you leave. Evacuate immediately. Turn off gas at meter if safe. Call SNGPL 1199 or 1122 from outside.
After: Do not re-enter until cleared. Do not light flame. Report to SNGPL 1199 (Lahore/North) or SSGC 1199 (Karachi/South).
Emergency Number: 1122

[Road Accident]
Before: Keep first aid kit in vehicle, Save emergency numbers (1122, 115), Always wear seatbelt.
During: Call 1122 (Rescue) immediately. Place warning triangles. Do NOT move injured person unless in immediate danger. Apply pressure to bleeding wounds. Keep injured person warm/calm.
After: Give exact location to 1122. Note vehicle numbers. Call Police 15 if needed for FIR.
Emergency Number: 1122
";

            var systemPrompt = $@"You are Pakistan's Emergency Disaster Assistant inside the 'Nigehbaan' app (Pakistan's Guardian Network). You help citizens during disasters and emergencies in Pakistan.
Rules:
1. Always respond in simple, clear English or Urdu.
2. ALWAYS base your advice strictly on the provided RAG Context. Do NOT hallucinate advice outside of this context.
3. Give step-by-step guidance for immediate safety based on the specific situation.
4. Be brief and actionable — people are in stressful situations.
5. Always end with ""Call 1122 immediately if this is life-threatening.""
6. You know Pakistan's geography and disaster context.
7. Mention relevant Pakistan organizations when appropriate (e.g. NDMA, PDMA, SNGPL).
8. Keep responses under 200 words unless absolutely necessary.

{ragContext}

You are NOT a replacement for emergency services. Always direct people to call emergency numbers.";

            var geminiContents = request.Messages.Select(m => new
            {
                role = m.Role == "assistant" ? "model" : "user",
                parts = new[] { new { text = m.Content } }
            }).ToArray();

            var payload = new
            {
                contents = geminiContents,
                systemInstruction = new { parts = new[] { new { text = systemPrompt } } },
                generationConfig = new
                {
                    temperature = 0.2,
                    maxOutputTokens = 1024
                }
            };

            var model = _config["GeminiModel"] ?? "gemini-3.6-flash";
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            try
            {
                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(25));
                var response = await _httpClient.PostAsync(url, content, cts.Token);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError(
                        "Gemini API call failed ({StatusCode}) using model '{Model}': {Body}",
                        response.StatusCode, model, responseBody);

                    string? googleReason = null;
                    try
                    {
                        using var errDoc = JsonDocument.Parse(responseBody);
                        if (errDoc.RootElement.TryGetProperty("error", out var errEl) &&
                            errEl.TryGetProperty("message", out var msgEl))
                        {
                            googleReason = msgEl.GetString();
                        }
                    }
                    catch { /* body wasn't JSON or didn't match expected shape */ }

                    var diagnostic = response.StatusCode switch
                    {
                        System.Net.HttpStatusCode.Forbidden =>
                            "API key is invalid, restricted, or the Generative Language API isn't enabled for its Google Cloud project.",
                        System.Net.HttpStatusCode.NotFound =>
                            $"Model '{model}' was not found for this API version/key — check the GeminiModel setting.",
                        System.Net.HttpStatusCode.TooManyRequests =>
                            "Gemini free-tier rate limit reached — wait a moment and try again.",
                        System.Net.HttpStatusCode.BadRequest =>
                            "Malformed request sent to Gemini.",
                        _ => "Unexpected error from Gemini API."
                    };

                    var reasonText = !string.IsNullOrWhiteSpace(googleReason) ? $" ({googleReason})" : "";

                    return Ok(new
                    {
                        content = new[] { new {
                            text = $"⚠️ AI assistant error — HTTP {(int)response.StatusCode} {response.StatusCode}: {diagnostic}{reasonText}\n\nCheck server logs for the full response. Please call **1122** (Rescue) or **115** (Edhi) directly for any real emergency."
                        } }
                    });
                }

                using var doc = JsonDocument.Parse(responseBody);
                var root = doc.RootElement;
                string? replyText = null;

                if (root.TryGetProperty("candidates", out var candidates) &&
                    candidates.GetArrayLength() > 0)
                {
                    var firstCandidate = candidates[0];

                    if (firstCandidate.TryGetProperty("content", out var geminiContent) &&
                        geminiContent.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0)
                    {
                        var texts = new System.Collections.Generic.List<string>();
                        foreach (var part in parts.EnumerateArray())
                        {
                            if (part.TryGetProperty("text", out var textEl))
                            {
                                texts.Add(textEl.GetString() ?? string.Empty);
                            }
                        }
                        
                        if (texts.Count > 0)
                        {
                            replyText = string.Join("", texts);
                        }
                    }
                    else if (firstCandidate.TryGetProperty("finishReason", out var finishReasonEl))
                    {
                        var finishReason = finishReasonEl.GetString();
                        _logger.LogWarning("Gemini returned no text content. finishReason: {Reason}", finishReason);
                        replyText = finishReason == "SAFETY"
                            ? "I can't answer that directly due to safety filters. If this is a real emergency, please call **1122** (Rescue) or **115** (Edhi) immediately."
                            : null;
                    }
                }

                replyText ??= "I could not generate a response. Please call 1122 immediately.";

                return Ok(new { content = new[] { new { text = replyText } } });
            }
            catch (OperationCanceledException)
            {
                _logger.LogError("Gemini API call timed out after 25s for model '{Model}'", model);
                return Ok(new
                {
                    content = new[] { new { text = "⚠️ AI assistant timed out waiting for a response. Please call **1122** immediately if this is an emergency." } }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error calling Gemini API");
                return Ok(new
                {
                    content = new[] { new { text = $"⚠️ Connection error reaching the AI assistant ({ex.GetType().Name}). Please call **1122** immediately if this is an emergency." } }
                });
            }
        }
    }
}