using DisasterPreparedness_ResponseSystem.Core.Models;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class GlideEventParser
    {
        private readonly HttpClient _http;
        private readonly ILogger<GlideEventParser>? _logger;

        public GlideEventParser(HttpClient httpClient, ILogger<GlideEventParser>? logger = null)
        {
            _http = httpClient;
            _logger = logger;
        }

        private static readonly string[] CityNames =
        {
            "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Gujranwala", "Faisalabad",
            "Multan", "Peshawar", "Mardan", "Abbottabad", "Quetta", "Sukkur",
            "Hyderabad", "Bahawalpur", "Sialkot"
        };

        private static readonly Dictionary<string, string> GlideTypeMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["FL"] = "Flood",
            ["ST"] = "Storm",
            ["TC"] = "Storm",
            ["HT"] = "Heatwave",
            ["DR"] = "Drought",
            ["EQ"] = "Earthquake"
        };

        public async Task<List<KnownDisaster>> GetKnownDisastersAsync()
        {
            var csv = await _http.GetStringAsync(
                "https://data.humdata.org/dataset/94ccdbb8-9ba7-4c83-bf3e-d5fd53da1793/resource/bdcb808b-0a7f-4664-9eba-86d1902635e0/download/pak_glide_events.csv");

            var lines = csv.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                           .Skip(1);

            var results = new List<KnownDisaster>();
            int totalLines = 0, skippedType = 0, skippedCity = 0, skippedDate = 0, skippedOld = 0;

            var earliestYear = DateTime.UtcNow.Year - 4;

            foreach (var line in lines)
            {
                totalLines++;
                var cols = ParseCsvLine(line);
                if (cols.Count < 9) continue;

                var eventCode = cols.ElementAtOrDefault(0)?.Trim('"') ?? "";
                var location = cols.ElementAtOrDefault(4)?.Trim('"') ?? "";
                var level0 = cols.ElementAtOrDefault(3)?.Trim('"') ?? "";

                if (eventCode.Length < 2 || !GlideTypeMap.TryGetValue(eventCode[..2], out var type))
                {
                    skippedType++;
                    continue;
                }

                if (!string.Equals(level0, "PK", StringComparison.OrdinalIgnoreCase))
                    continue;

                var city = CityNames.FirstOrDefault(c =>
                    location.Contains(c, StringComparison.OrdinalIgnoreCase));

                if (city == null)
                {
                    skippedCity++;
                    _logger?.LogDebug("GLIDE location skipped: {Location}", location);
                    continue;
                }

                if (!int.TryParse(cols.ElementAtOrDefault(6)?.Trim('"'), out var year))
                {
                    skippedDate++;
                    continue;
                }

                if (year < earliestYear)
                {
                    skippedOld++;
                    continue;
                }

                int.TryParse(cols.ElementAtOrDefault(7)?.Trim('"'), out var month);
                int.TryParse(cols.ElementAtOrDefault(8)?.Trim('"'), out var day);

                if (month < 1 || month > 12 || day < 1 || day > 31)
                {
                    skippedDate++;
                    continue;
                }

                try
                {
                    results.Add(new KnownDisaster
                    {
                        City = city,
                        Date = new DateTime(year, month, day),
                        Type = type
                    });
                }
                catch { skippedDate++; }
            }

            _logger?.LogInformation(
                "GLIDE parser: {Parsed} disaster rows kept from {Lines} lines; skipped type={SkippedType}, city={SkippedCity}, date={SkippedDate}, too-old={SkippedOld}",
                results.Count, totalLines, skippedType, skippedCity, skippedDate, skippedOld);

            return results;
        }

        private static List<string> ParseCsvLine(string line)
        {
            var values = new List<string>();
            bool inQuotes = false;
            var current = new System.Text.StringBuilder();

            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];
                if (c == '"')
                {
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        current.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = !inQuotes;
                    }
                }
                else if (c == ',' && !inQuotes)
                {
                    values.Add(current.ToString());
                    current.Clear();
                }
                else
                {
                    current.Append(c);
                }
            }

            values.Add(current.ToString());
            return values;
        }
    }
}
