using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Core.Models;
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

namespace DisasterPreparedness_ResponseSystem.Infrastructure.BackgroundServices
{
    public class PreparednessForecastService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PreparednessForecastService> _logger;
        private readonly MonitoringConfig _config;

        // Runs twice a day — no need for 5-min polling like live monitoring
        private static readonly TimeSpan RunInterval = TimeSpan.FromHours(12);

        public PreparednessForecastService(
            IServiceScopeFactory scopeFactory,
            ILogger<PreparednessForecastService> logger,
            IOptions<MonitoringConfig> config)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _config = config.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Preparedness Forecast Service started. Checking {Count} cities twice daily.",
                _config.PakistanCities.Count);

            while (!stoppingToken.IsCancellationRequested)
            {
                try { await RunForecastCycleAsync(); }
                catch (Exception ex) { _logger.LogError(ex, "Error in preparedness forecast cycle"); }

                await Task.Delay(RunInterval, stoppingToken);
            }
        }

        private async Task RunForecastCycleAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var services = scope.ServiceProvider;

            var forecastApi = services.GetRequiredService<IWeatherForecastApiService>();
            var advisorySvc = services.GetRequiredService<IPreparednessAdvisoryService>();
            var alertSvc = services.GetRequiredService<IAlertService>();

            _logger.LogInformation("[{Time}] Running preparedness forecast check for {Count} cities...",
                DateTime.UtcNow.ToString("HH:mm:ss"), _config.PakistanCities.Count);

            foreach (var city in _config.PakistanCities)
            {
                var daily = await forecastApi.GetDailyForecastAsync(city.Latitude, city.Longitude, forecastDays: 3);
                if (daily == null || daily.Time.Count == 0) continue;

                // Check tomorrow and the day after (index 0 is today — skip it, live monitoring covers today)
                for (int dayIndex = 1; dayIndex < daily.Time.Count; dayIndex++)
                {
                    var result = PreparednessRuleEngine.EvaluateDay(daily, dayIndex, city.Name, _config.Thresholds);
                    if (result == null) continue;

                    var forecastDate = DateTime.Parse(daily.Time[dayIndex]);

                    var advisory = await advisorySvc.CreateIfNewAsync(
                        city.Name, city.Latitude, city.Longitude,
                        result.Value.Type, result.Value.Severity,
                        forecastDate, result.Value.Description);

                    if (advisory != null)
                    {
                        await alertSvc.SendPreparednessAdvisoryAsync(advisory);
                        _logger.LogWarning("PREPAREDNESS ADVISORY: {Type} in {City} for {Date} | Severity: {Severity}",
                            result.Value.Type, city.Name, forecastDate.ToShortDateString(), result.Value.Severity);
                            
                        // Organization Standby Alert Logic
                        var dbContext = services.GetRequiredService<DisasterPreparedness_ResponseSystem.Infrastructure.Data.AppDbContext>();
                        var matchingOrgs = dbContext.ResponderOrganizations
                            .Where(o => o.IsActive && o.BaseLatitude != 0) // Very basic location check, you could do actual distance matching here
                            .ToList();
                            
                        // Simple assignment mapping based on type
                        var relevantTypes = GetRelevantOrganizationTypes(result.Value.Type);
                        var targetOrgs = matchingOrgs.Where(o => relevantTypes.Contains(o.Type) && DisasterPreparedness_ResponseSystem.Core.Helpers.DistanceCalculator.CalculateKm(city.Latitude, city.Longitude, o.BaseLatitude, o.BaseLongitude) < 50).ToList();

                        foreach (var org in targetOrgs)
                        {
                            await alertSvc.SendOrgStandbyAlertAsync(advisory, org);
                            _logger.LogInformation("Sent Standby Alert to {OrgName} for {City} {Type}", org.Name, city.Name, result.Value.Type);
                        }
                    }
                }
            }
        }

        private List<DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType> GetRelevantOrganizationTypes(DisasterPreparedness_ResponseSystem.Core.Entity.Enums.DisasterType disasterType)
        {
            return disasterType switch
            {
                DisasterPreparedness_ResponseSystem.Core.Entity.Enums.DisasterType.Flood => new List<DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType> { DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType.Rescue1122, DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType.WASA, DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType.PDMA },
                DisasterPreparedness_ResponseSystem.Core.Entity.Enums.DisasterType.Heatwave => new List<DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType> { DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType.Rescue1122, DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType.HealthDepartment, DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType.EdhiFoundation },
                DisasterPreparedness_ResponseSystem.Core.Entity.Enums.DisasterType.Smog => new List<DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType> { DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType.EnvironmentDepartment, DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType.HealthDepartment },
                _ => new List<DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType> { DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType.Rescue1122, DisasterPreparedness_ResponseSystem.Core.Entity.Enums.OrganizationType.PDMA }
            };
        }
    }
}
