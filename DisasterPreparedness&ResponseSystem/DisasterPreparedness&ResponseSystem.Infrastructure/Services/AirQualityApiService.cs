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
    public class AirQualityApiService : IAirQualityApiService
    {
        private readonly HttpClient _httpClient;
        private static readonly JsonSerializerOptions JsonOptions = new()
        { PropertyNameCaseInsensitive = true };

        public AirQualityApiService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri("https://air-quality-api.open-meteo.com/");
        }

        public async Task<AirQualityData?> GetAirQualityAsync(double latitude, double longitude)
        {
            try
            {
                var url = $"v1/air-quality" +
                          $"?latitude={latitude}&longitude={longitude}" +
                          $"&current=european_aqi,us_aqi,pm2_5,pm10" +
                          $"&timezone=Asia%2FKarachi";

                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<AirQualityApiResponse>(json, JsonOptions);
                return data?.Current;
            }
            catch { return null; }
        }
    }
}
