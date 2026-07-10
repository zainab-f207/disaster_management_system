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
    public class EarthquakeApiService : IEarthquakeApiService
    {
        private readonly HttpClient _httpClient;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public EarthquakeApiService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri("https://earthquake.usgs.gov/");
        }

        public async Task<List<EarthquakeFeature>> GetRecentEarthquakesInPakistanAsync(double minMagnitude)
        {
            try
            {
                
                var startTime = DateTime.UtcNow.AddMinutes(-10).ToString("yyyy-MM-ddTHH:mm:ss");

                var url = $"fdsnws/event/1/query" +
                          $"?format=geojson" +
                          $"&minmagnitude={minMagnitude}" +
                          $"&minlatitude=23&maxlatitude=37" +
                          $"&minlongitude=60&maxlongitude=77" +
                          $"&starttime={startTime}" +       
                          $"&orderby=time";

                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode) return new();

                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<EarthquakeApiResponse>(json, JsonOptions);

                return data?.Features ?? new();
            }
            catch
            {
                return new();
            }
        }
    }

}