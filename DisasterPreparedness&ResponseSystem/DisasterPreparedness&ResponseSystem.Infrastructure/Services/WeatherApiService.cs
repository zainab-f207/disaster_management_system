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
    public class WeatherApiService : IWeatherApiService
    {
        private readonly HttpClient _httpClient;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public WeatherApiService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri("https://api.open-meteo.com/");
        }

        public async Task<CurrentWeather?> GetCurrentWeatherAsync(double latitude, double longitude)
        {
            try
            {
                var url = $"v1/forecast" +
                          $"?latitude={latitude}" +
                          $"&longitude={longitude}" +
                          $"&current=temperature_2m" +
                          $",apparent_temperature" +       
                          $",precipitation" +
                          $",rain" +
                          $",snowfall" +
                          $",wind_speed_10m" +
                          $",wind_gusts_10m" +             
                          $",relative_humidity_2m" +
                          $",uv_index" +
                          $",weather_code" +
                          $"&wind_speed_unit=kmh" +
                          $"&timezone=Asia%2FKarachi";

                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<WeatherApiResponse>(json, JsonOptions);
                return data?.Current;
            }
            catch { return null; }
        }
    }
}
