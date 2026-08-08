using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class HistoricalDatasetBuilder
    {
        private readonly HttpClient _http;

        private static readonly (string Name, double Lat, double Lon)[] Cities =
        {
            ("Karachi", 24.8607, 67.0011), ("Lahore", 31.5204, 74.3587),
            ("Islamabad", 33.6844, 73.0479), ("Rawalpindi", 33.5651, 73.0169),
            ("Gujranwala", 32.1617, 74.1883), ("Faisalabad", 31.4504, 73.1350),
            ("Multan", 30.1575, 71.5249), ("Peshawar", 34.0151, 71.5249),
            ("Mardan", 34.2016, 72.0401), ("Abbottabad", 34.1682, 73.2303),
            ("Quetta", 30.1798, 66.9750), ("Sukkur", 27.7132, 68.8490),
            ("Hyderabad", 25.3960, 68.3578), ("Bahawalpur", 29.3989, 71.6832),
            ("Sialkot", 32.4945, 74.5229)
        };

        public HistoricalDatasetBuilder(HttpClient httpClient) => _http = httpClient;

        // Fetches real recorded daily weather for one city over a date range.
        // Free, no API key, no rate limit for reasonable use.
        public async Task<Dictionary<string, (double rain, double wind, double gusts, double temp, double feels, double humidity)>>
            GetHistoricalWeatherAsync(double lat, double lon, DateTime start, DateTime end)
        {
            var url = $"https://archive-api.open-meteo.com/v1/archive" +
                      $"?latitude={lat}&longitude={lon}" +
                      $"&start_date={start:yyyy-MM-dd}&end_date={end:yyyy-MM-dd}" +
                      $"&daily=precipitation_sum,windspeed_10m_max,windgusts_10m_max," +
                      $"temperature_2m_max,apparent_temperature_max,relative_humidity_2m_max" +
                      $"&timezone=Asia%2FKarachi";

            var json = await _http.GetStringAsync(url);
            using var doc = JsonDocument.Parse(json);
            var daily = doc.RootElement.GetProperty("daily");

            var dates = daily.GetProperty("time").EnumerateArray().Select(x => x.GetString()!).ToList();
            var rain = daily.GetProperty("precipitation_sum").EnumerateArray().Select(x => x.GetDouble()).ToList();
            var wind = daily.GetProperty("windspeed_10m_max").EnumerateArray().Select(x => x.GetDouble()).ToList();
            var gusts = daily.GetProperty("windgusts_10m_max").EnumerateArray().Select(x => x.GetDouble()).ToList();
            var temp = daily.GetProperty("temperature_2m_max").EnumerateArray().Select(x => x.GetDouble()).ToList();
            var feels = daily.GetProperty("apparent_temperature_max").EnumerateArray().Select(x => x.GetDouble()).ToList();
            var hum = daily.GetProperty("relative_humidity_2m_max").EnumerateArray().Select(x => x.GetDouble()).ToList();

            var result = new Dictionary<string, (double, double, double, double, double, double)>();
            for (int i = 0; i < dates.Count; i++)
                result[dates[i]] = (rain[i], wind[i], gusts[i], temp[i], feels[i], hum[i]);
            return result;
        }

        // Builds the labeled dataset: GLIDE / local disaster dates = positive rows,
        // real non-disaster dates = negative rows. All weather values are real recorded history.
        public async Task<List<TrainingRow>> BuildDatasetAsync(
            List<KnownDisaster>? knownDisasters = null,
            List<Disaster>? localDisasters = null)
        {
            var rows = new List<TrainingRow>();
            var rnd = new Random(42);

            var mergedDisasters = MergeDisasterSources(knownDisasters, localDisasters);

            foreach (var city in Cities)
            {
                // Pull real recorded weather for this city.
                var start = DateTime.UtcNow.AddYears(-3);
                var end = DateTime.UtcNow.AddDays(-2); // archive API needs a couple days' lag
                var weather = await GetHistoricalWeatherAsync(city.Lat, city.Lon, start, end);

                var disastersForCity = mergedDisasters
                    .Where(d => d.City == city.Name)
                    .ToLookup(d => d.Date.ToString("yyyy-MM-dd"));

                foreach (var kv in weather)
                {
                    bool isDisasterDay = disastersForCity.Contains(kv.Key);

                    // Positive rows: exact labeled disaster dates.
                    // Negative rows: sample ~15% of remaining real non-disaster days (keeps dataset balanced-ish)
                    if (!isDisasterDay && rnd.NextDouble() > 0.15) continue;

                    var matched = disastersForCity[kv.Key].FirstOrDefault();
                    rows.Add(new TrainingRow
                    {
                        City = city.Name,
                        Date = kv.Key,
                        Type = matched?.Type ?? "None",
                        RainSum = (float)kv.Value.rain,
                        WindMax = (float)kv.Value.wind,
                        GustsMax = (float)kv.Value.gusts,
                        TempMax = (float)kv.Value.temp,
                        ApparentTempMax = (float)kv.Value.feels,
                        HumidityMax = (float)kv.Value.humidity,
                        DisasterOccurred = isDisasterDay,
                    });
                }

                await Task.Delay(500);
            }

            return rows;
        }

        private static List<KnownDisaster> MergeDisasterSources(
            List<KnownDisaster>? knownDisasters,
            List<Disaster>? localDisasters)
        {
            var merged = new List<KnownDisaster>();

            if (knownDisasters != null)
                merged.AddRange(knownDisasters);

            if (localDisasters != null)
            {
                merged.AddRange(localDisasters
                    .Where(d => d.Status == DisasterStatus.Verified ||
                                d.Status == DisasterStatus.ResponseInProgress ||
                                d.Status == DisasterStatus.Resolved ||
                                d.Status == DisasterStatus.Closed)
                    .Select(d => new KnownDisaster
                    {
                        City = MapDisasterToCity(d),
                        Date = (d.VerifiedAt ?? d.ReportedAt).Date,
                        Type = d.Type.ToString()
                    })
                    .Where(k => !string.IsNullOrEmpty(k.City)));
            }

            // Deduplicate so the same date doesn't get double-counted.
            return merged
                .GroupBy(d => new { d.City, d.Date, d.Type })
                .Select(g => g.First())
                .ToList();
        }

        private static string MapDisasterToCity(Disaster disaster)
        {
            var closest = Cities
                .OrderBy(c => HaversineKm(disaster.Latitude, disaster.Longitude, c.Lat, c.Lon))
                .FirstOrDefault();

            return closest.Name ?? string.Empty;
        }

        private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371.0;
            double dLat = ToRad(lat2 - lat1);
            double dLon = ToRad(lon2 - lon1);
            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                       Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }

        private static double ToRad(double deg) => deg * Math.PI / 180.0;
    }
}
