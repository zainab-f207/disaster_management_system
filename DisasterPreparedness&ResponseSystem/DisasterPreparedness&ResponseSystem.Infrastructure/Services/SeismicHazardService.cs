using System.Text.Json;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public record SeismicHazard(string City, int EventCount10Yr, double AvgMagnitude, string HazardLevel);

    public class SeismicHazardService
    {
        private readonly HttpClient _http;
        private static (DateTime ts, List<SeismicHazard> data)? _cache;
        private static readonly SemaphoreSlim _lock = new(1, 1);

        public SeismicHazardService(IHttpClientFactory factory) => _http = factory.CreateClient();

        private static readonly (string Name, double Lat, double Lon)[] Cities =
        {
            ("Lahore", 31.5204, 74.3587), ("Karachi", 24.8607, 67.0011),
            ("Islamabad", 33.6844, 73.0479), ("Peshawar", 34.0151, 71.5249),
            ("Quetta", 30.1798, 66.9750), ("Multan", 30.1575, 71.5249),
            ("Faisalabad", 31.4504, 73.1350), ("Rawalpindi", 33.5651, 73.0169),
        };

        public async Task<List<SeismicHazard>> GetHazardsAsync()
        {
            if (_cache is { } c && DateTime.UtcNow - c.ts < TimeSpan.FromDays(7)) return c.data;

            await _lock.WaitAsync();
            try
            {
                if (_cache is { } cInner && DateTime.UtcNow - cInner.ts < TimeSpan.FromDays(7)) return cInner.data;

                var results = new List<SeismicHazard>();
                var start = DateTime.UtcNow.AddYears(-10).ToString("yyyy-MM-dd");

                foreach (var city in Cities)
                {
                    // Real USGS query — earthquakes within ~150km of the city, last 10 years, M4.0+
                    var url = $"https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson" +
                              $"&starttime={start}&minmagnitude=4.0" +
                              $"&latitude={city.Lat}&longitude={city.Lon}&maxradiuskm=150";

                    var json = await _http.GetStringAsync(url);
                    using var doc = JsonDocument.Parse(json);
                    var features = doc.RootElement.GetProperty("features");

                    int count = 0; double magSum = 0;
                    foreach (var f in features.EnumerateArray())
                    {
                        count++;
                        magSum += f.GetProperty("properties").GetProperty("mag").GetDouble();
                    }

                    double avgMag = count > 0 ? magSum / count : 0;
                    string level = count >= 15 ? "High" : count >= 5 ? "Medium" : "Low";

                    results.Add(new SeismicHazard(city.Name, count, Math.Round(avgMag, 1), level));
                    await Task.Delay(300);
                }

                _cache = (DateTime.UtcNow, results);
                return results;
            }
            finally { _lock.Release(); }
        }
    }
}
