using DisasterPreparedness_ResponseSystem.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public static class PreparednessRuleEngine
    {
        // Evaluates ONE day's forecast at index `dayIndex` against thresholds.
        // Deliberately uses a slightly lower bar than DisasterRuleEngine's live thresholds,
        // since this is "heads up", not "act now".
        public static (DisasterType Type, SeverityLevel Severity, string Description)?
            EvaluateDay(DailyForecast daily, int dayIndex, string city, ThresholdConfig t)
        {
            if (dayIndex >= daily.Time.Count) return null;

            double rain = daily.Precipitation_Sum.ElementAtOrDefault(dayIndex);
            double wind = daily.Windspeed_10m_Max.ElementAtOrDefault(dayIndex);
            double gusts = daily.Windgusts_10m_Max.ElementAtOrDefault(dayIndex);
            double feels = daily.Apparent_Temperature_Max.ElementAtOrDefault(dayIndex);
            double temp = daily.Temperature_2m_Max.ElementAtOrDefault(dayIndex);

            // Use 80% of the live threshold — "trending toward" rather than "already there"
            const double advisoryFactor = 0.8;

            if (rain >= t.RainfallMmPerHour * advisoryFactor)
            {
                var sev = rain >= t.RainfallMmPerHour ? SeverityLevel.High : SeverityLevel.Medium;
                return (DisasterType.Flood, sev,
                    $"Heavy rainfall forecasted for {city}: {rain:F1}mm expected. Flood risk building.");
            }

            if (wind >= t.WindSpeedKmh * advisoryFactor || gusts >= t.WindGustsKmh * advisoryFactor)
            {
                var sev = gusts >= t.WindGustsKmh ? SeverityLevel.High : SeverityLevel.Medium;
                return (DisasterType.Storm, sev,
                    $"Strong winds forecasted for {city}: up to {wind:F0}km/h ({gusts:F0}km/h gusts).");
            }

            if (feels >= t.ApparentTemperatureCelsius * advisoryFactor || temp >= t.TemperatureCelsius * advisoryFactor)
            {
                var sev = feels >= t.ApparentTemperatureCelsius ? SeverityLevel.High : SeverityLevel.Medium;
                return (DisasterType.Heatwave, sev,
                    $"Extreme heat forecasted for {city}: up to {temp:F0}°C (feels like {feels:F0}°C).");
            }

            return null;
        }
    }
}
