using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class WeatherForecastApiService : IWeatherForecastApiService
    {
        private readonly HttpClient _httpClient;
        private static readonly JsonSerializerOptions JsonOptions = new()
        { PropertyNameCaseInsensitive = true };

        public WeatherForecastApiService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri("https://api.open-meteo.com/");
        }

        public async Task<DailyForecast?> GetDailyForecastAsync(double latitude, double longitude, int forecastDays = 3)
        {
            try
            {
                var url = $"v1/forecast" +
                          $"?latitude={latitude}&longitude={longitude}" +
                          $"&daily=precipitation_sum,windspeed_10m_max,windgusts_10m_max," +
                          $"temperature_2m_max,apparent_temperature_max,relative_humidity_2m_max,uv_index_max" +
                          $"&forecast_days={forecastDays}" +
                          $"&timezone=Asia%2FKarachi";

                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<WeatherForecastApiResponse>(json, JsonOptions);
                return data?.Daily;
            }
            catch { return null; }
        }
    }
}
