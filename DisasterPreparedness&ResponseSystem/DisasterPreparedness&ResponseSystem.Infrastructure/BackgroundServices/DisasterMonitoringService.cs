using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Helpers;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Core.Models;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using DisasterPreparedness_ResponseSystem.Infrastructure.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.BackgroundServices
{
    public class DisasterMonitoringService : BackgroundService
    {
        
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<DisasterMonitoringService> _logger;
        private readonly MonitoringConfig _config;

        public DisasterMonitoringService(
            IServiceScopeFactory scopeFactory,
            ILogger<DisasterMonitoringService> logger,
            IOptions<MonitoringConfig> config)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _config = config.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Disaster Monitoring Service started. Monitoring {Count} Pakistan cities.",
                _config.PakistanCities.Count);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunCheckCycleAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in disaster monitoring cycle");
                }

                
                await Task.Delay(
                    TimeSpan.FromMinutes(_config.WeatherCheckIntervalMinutes),
                    stoppingToken);
            }
        }

        private async Task RunCheckCycleAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var services = scope.ServiceProvider;

            var weatherApi = services.GetRequiredService<IWeatherApiService>();
            var aqiApi = services.GetRequiredService<IAirQualityApiService>();
            var earthquakeApi = services.GetRequiredService<IEarthquakeApiService>();
            var duplicateCheck = services.GetRequiredService<IDuplicateCheckService>();
            var assignmentSvc = services.GetRequiredService<IResponderAssignmentService>();
            var alertSvc = services.GetRequiredService<IAlertService>();
            var db = services.GetRequiredService<AppDbContext>();

            _logger.LogInformation("[{Time}] Running monitoring check for {Count} cities...",
                DateTime.UtcNow.ToString("HH:mm:ss"), _config.PakistanCities.Count);

            foreach (var city in _config.PakistanCities)
            {
                var weatherTask = weatherApi.GetCurrentWeatherAsync(city.Latitude, city.Longitude);
                var aqiTask = aqiApi.GetAirQualityAsync(city.Latitude, city.Longitude);
                await Task.WhenAll(weatherTask, aqiTask);

                var weather = weatherTask.Result;
                var aqi = aqiTask.Result;

                if (weather != null)
                {
                    _logger.LogInformation(
                        "{City}: {Temp}°C (feels {FeelsLike}°C) | Rain {Rain}mm | " +
                        "Wind {Wind}km/h (gusts {Gusts}km/h) | Humidity {Humidity}% | UV {UV}",
                        city.Name,
                        weather.Temperature_2m, weather.Apparent_Temperature,
                        weather.Rain, weather.Wind_Speed_10m, weather.Wind_Gusts_10m,
                        weather.Relative_Humidity_2m, weather.Uv_Index);

                    var weatherResult = DisasterRuleEngine
                        .EvaluateWeather(weather, city.Name, _config.Thresholds);

                    if (weatherResult != null)
                        await ProcessDisasterResultAsync(
                            db, assignmentSvc, alertSvc, duplicateCheck,
                            weatherResult.Value, city, DisasterSource.WeatherApi);
                }

                if (aqi != null)
                {
                    _logger.LogInformation("{City}: AQI (US) {AQI} | PM2.5 {PM25}",
                        city.Name, aqi.Us_Aqi, aqi.Pm2_5);

                    var aqiResult = DisasterRuleEngine
                        .EvaluateAirQuality(aqi, city.Name, _config.Thresholds);

                    if (aqiResult != null)
                        await ProcessDisasterResultAsync(
                            db, assignmentSvc, alertSvc, duplicateCheck,
                            aqiResult.Value, city, DisasterSource.WeatherApi);
                }
            }

            var quakes = await earthquakeApi.GetRecentEarthquakesInPakistanAsync(
                _config.Thresholds.EarthquakeMagnitude);

            _logger.LogInformation("USGS: {Count} earthquake(s) in Pakistan", quakes.Count);

            foreach (var quake in quakes)
            {
                if (quake.Geometry?.Coordinates.Count < 2) continue;
                double qLon = quake.Geometry.Coordinates[0];
                double qLat = quake.Geometry.Coordinates[1];

                var exists = await duplicateCheck.ActiveDisasterExistsAsync(
                    DisasterType.Earthquake, qLat, qLon, 100);
                if (exists) continue;

                var result = DisasterRuleEngine.EvaluateEarthquake(quake);
                var disaster = new Disaster
                {
                    Type = result.Type,
                    Severity = result.Severity,
                    Description = result.Description,
                    Status = DisasterStatus.Verified,
                    Source = DisasterSource.EarthquakeApi,
                    Latitude = qLat,
                    Longitude = qLon,
                    VerifiedAt = DateTime.UtcNow
                };

                await CreateAndAssignDisasterAsync(db, assignmentSvc, alertSvc, disaster);
            }
        }
        private async Task ProcessDisasterResultAsync(
            AppDbContext db,
            IResponderAssignmentService assignmentSvc,
            IAlertService alertSvc,
            IDuplicateCheckService duplicateCheck,
            (DisasterType Type, SeverityLevel Severity, string Description) result,
            CityConfig city,
            DisasterSource source)
        {
            var exists = await duplicateCheck.ActiveDisasterExistsAsync(
                result.Type, city.Latitude, city.Longitude, 50);

            if (exists)
            {
                _logger.LogInformation("Duplicate {Type} skipped for {City}", result.Type, city.Name);
                return;
            }

            if (!DisasterCategoryHelper.CanBeAutoDetected(result.Type))
            {
                _logger.LogWarning("Attempted to auto-create man-made disaster {Type} — blocked", result.Type);
                return;
            }

            var disaster = new Disaster
            {
                Type = result.Type,
                Severity = result.Severity,
                Description = result.Description,
                Status = DisasterStatus.Verified,
                Source = source,
                Latitude = city.Latitude,
                Longitude = city.Longitude,
                VerifiedAt = DateTime.UtcNow
            };

            await CreateAndAssignDisasterAsync(db, assignmentSvc, alertSvc, disaster);

            _logger.LogWarning("AUTO-DISASTER: {Type} in {City} | Severity: {Severity}",
                result.Type, city.Name, result.Severity);
        }

        private static async Task<Disaster> CreateAndAssignDisasterAsync(
            AppDbContext db,
            IResponderAssignmentService assignmentService,
            IAlertService alertService,       
            Disaster disaster)
        {
            db.Disasters.Add(disaster);
            await db.SaveChangesAsync();

            try
            {
                var assignment = await assignmentService.AutoAssignAsync(disaster.Id);
                await alertService.SendDisasterAlertAsync(disaster);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Auto-assign/alert failed for disaster {disaster.Id}: {ex.Message}");
            }

            return disaster;
        }
    }
}
