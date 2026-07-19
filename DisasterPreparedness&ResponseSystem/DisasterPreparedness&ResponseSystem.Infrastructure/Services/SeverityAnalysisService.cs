using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class SeverityAnalysisService : ISeverityAnalysisService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<SeverityAnalysisService> _logger;

        public SeverityAnalysisService(HttpClient httpClient, IConfiguration config, ILogger<SeverityAnalysisService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
            _httpClient.BaseAddress = new Uri("https://api-inference.huggingface.co/");
            _httpClient.Timeout = TimeSpan.FromSeconds(8); 
        }

        public async Task<string> EstimateSeverityAsync(string description)
        {
            var token = _config["HuggingFace:ApiToken"];

            if (!string.IsNullOrWhiteSpace(token))
            {
                try
                {
                    var aiResult = await CallHuggingFaceAsync(description, token);
                    if (aiResult != null)
                    {
                        _logger.LogInformation("Severity estimated via Hugging Face: {Result}", aiResult);
                        return aiResult;
                    }
                }
                catch (Exception ex)
                {
                    // Covers: rate limit (429), credits exhausted (402), timeout, network error, model cold-start
                    _logger.LogWarning("Hugging Face unavailable, falling back to rule-based scoring: {Msg}", ex.Message);
                }
            }

            var fallback = RuleBasedSeverity(description);
            _logger.LogInformation("Severity estimated via rule-based fallback: {Result}", fallback);
            return fallback;
        }

        private async Task<string?> CallHuggingFaceAsync(string description, string token)
        {
            var payload = new
            {
                inputs = description,
                parameters = new { candidate_labels = new[] { "low severity", "medium severity", "high severity", "critical severity" } }
            };

            var request = new HttpRequestMessage(HttpMethod.Post, "models/facebook/bart-large-mnli")
            {
                Content = JsonContent.Create(payload)
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return null; // any failure -> fallback, no exception needed

            var json = await response.Content.ReadFromJsonAsync<HuggingFaceZeroShotResponse>();
            var topLabel = json?.Labels?.FirstOrDefault();

            return topLabel switch
            {
                "critical severity" => "Critical",
                "high severity" => "High",
                "medium severity" => "Medium",
                "low severity" => "Low",
                _ => null
            };
        }

        /// <summary>Simple keyword-based fallback — always available, zero external dependency.</summary>
        public static string RuleBasedSeverity(string description)
        {
            var text = (description ?? "").ToLower();
            var critical = new[] { "trapped", "dead", "collapsed", "dying", "unconscious", "fire spreading", "many injured", "multiple casualties" };
            var high = new[] { "injured", "flooding", "blocked", "smoke", "explosion", "urgent", "bleeding" };

            if (critical.Any(w => text.Contains(w))) return "Critical";
            if (high.Any(w => text.Contains(w))) return "High";
            return "Medium";
        }
    }

    public class HuggingFaceZeroShotResponse
    {
        public List<string>? Labels { get; set; }
        public List<double>? Scores { get; set; }
    }
}

