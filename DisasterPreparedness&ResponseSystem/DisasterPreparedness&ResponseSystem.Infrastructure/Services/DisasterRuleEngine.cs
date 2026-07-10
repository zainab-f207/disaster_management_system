using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Helpers;
using DisasterPreparedness_ResponseSystem.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public static class DisasterRuleEngine
    {
        public static (DisasterType Type, SeverityLevel Severity, string Description)?
     EvaluateWeather(CurrentWeather w, string city, ThresholdConfig t)
        {
            // ── Flood ───────────────────────────────────────────────
            if (w.Rain >= t.RainfallMmPerHour)
            {
                var severity = w.Rain >= t.RainfallMmPerHour * 2
                    ? SeverityLevel.Critical : SeverityLevel.High;
                return (DisasterType.Flood, severity,
                    $"Heavy rainfall in {city}: {w.Rain:F1}mm/hr. Flood risk detected.");
            }

            // ── Storm ───────────────────────────────────────────────
            if (w.Wind_Speed_10m >= t.WindSpeedKmh || w.Wind_Gusts_10m >= t.WindGustsKmh)
            {
                var maxWind = Math.Max(w.Wind_Speed_10m, w.Wind_Gusts_10m);
                var severity = maxWind >= t.WindGustsKmh * 1.3
                    ? SeverityLevel.Critical : SeverityLevel.High;
                return (DisasterType.Storm, severity,
                    $"Dangerous winds in {city}: {w.Wind_Speed_10m:F1}km/h avg, {w.Wind_Gusts_10m:F1}km/h gusts.");
            }

            // ── Heatwave (alert-only) ───────────────────────────────
            if (w.Apparent_Temperature >= t.ApparentTemperatureCelsius
                || w.Temperature_2m >= t.TemperatureCelsius)
            {
                var severity = w.Apparent_Temperature >= t.ApparentTemperatureCelsius + 5
                    ? SeverityLevel.Critical : SeverityLevel.High;
                return (DisasterType.Heatwave, severity,
                    $"Extreme heat in {city}: actual {w.Temperature_2m:F1}°C, " +
                    $"feels like {w.Apparent_Temperature:F1}°C. Humidity: {w.Relative_Humidity_2m}%. " +
                    DisasterCategoryHelper.GetPrecautionMessage(DisasterType.Heatwave));
            }

            // ── Dust Storm / Hazardous Wind (alert-only) ────────────
            if (w.Wind_Speed_10m >= t.WindSpeedKmh * 0.7 && w.Wind_Speed_10m < t.WindSpeedKmh)
            {
                return (DisasterType.DustStorm, SeverityLevel.Medium,
                    $"Hazardous wind conditions in {city}: {w.Wind_Speed_10m:F1}km/h. " +
                    DisasterCategoryHelper.GetPrecautionMessage(DisasterType.DustStorm));
            }

            // ── UV / Smog (alert-only) ──────────────────────────────
            if (w.Uv_Index >= t.UvIndexHigh)
            {
                return (DisasterType.Smog, SeverityLevel.Medium,
                    $"Extreme UV index in {city}: UV {w.Uv_Index:F0}. " +
                    DisasterCategoryHelper.GetPrecautionMessage(DisasterType.Smog));
            }

            return null;
        }

        public static (DisasterType Type, SeverityLevel Severity, string Description)?
            EvaluateAirQuality(AirQualityData aqi, string city, ThresholdConfig t)
        {
            if (aqi.Us_Aqi >= t.AqiUnhealthy)
            {
                var severity = aqi.Us_Aqi >= 200 ? SeverityLevel.Critical :
                               aqi.Us_Aqi >= 150 ? SeverityLevel.High :
                                                   SeverityLevel.Medium;

                // Note: We'd need to add Smog to DisasterType for full accuracy
                // For now mapping to Other — mention this in defense as future improvement
                return (DisasterType.Other, severity,
                    $"Hazardous air quality in {city}: AQI {aqi.Us_Aqi:F0} (US scale). " +
                    $"PM2.5: {aqi.Pm2_5:F1}µg/m³, PM10: {aqi.Pm10:F1}µg/m³. " +
                    $"Health emergency for sensitive groups.");
            }
            return null;
        }

        public static (DisasterType Type, SeverityLevel Severity, string Description)
            EvaluateEarthquake(EarthquakeFeature quake)
        {
            var mag = quake.Properties!.Mag;
            var place = quake.Properties.Place ?? "Pakistan";
            var severity = mag >= 7.0 ? SeverityLevel.Critical :
                           mag >= 6.0 ? SeverityLevel.High :
                           mag >= 5.0 ? SeverityLevel.Medium :
                                        SeverityLevel.Low;
            return (DisasterType.Earthquake, severity,
                $"Earthquake M{mag:F1} detected near {place}. " +
                $"Alert from USGS real-time feed.");
        }
    }
}