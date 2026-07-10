using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class GeocodingService : IGeocodingService
    {
        private readonly HttpClient _httpClient;
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public GeocodingService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri("https://nominatim.openstreetmap.org/");
            // Nominatim requires a User-Agent header — use your project name
            _httpClient.DefaultRequestHeaders.UserAgent
                .ParseAdd("PakistanDisasterResponseSystem/1.0");
        }

        public async Task<GeocodingResult?> SearchLocationAsync(string query)
        {
            var results = await SearchLocationsAsync(query);
            return results.FirstOrDefault();
        }

        public async Task<List<GeocodingResult>> SearchLocationsAsync(string query)
        {
            try
            {
                // countrycodes=pk → only return Pakistan results
                var url = $"search?q={Uri.EscapeDataString(query)}" +
                          $"&format=json&addressdetails=1&limit=5&countrycodes=pk";

                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) return new();

                var json = await response.Content.ReadAsStringAsync();
                var raw = JsonSerializer.Deserialize<List<NominatimResult>>(json, JsonOptions);

                return raw?.Select(r => new GeocodingResult
                {
                    DisplayName = r.DisplayName ?? string.Empty,
                    Latitude = double.Parse(r.Lat ?? "0"),
                    Longitude = double.Parse(r.Lon ?? "0"),
                    City = r.Address?.City
                        ?? r.Address?.Town
                        ?? r.Address?.Village
                        ?? r.Address?.County
                        ?? string.Empty,
                    Province = r.Address?.State ?? string.Empty
                }).ToList() ?? new();
            }
            catch
            {
                return new();
            }
        }

    }
}
