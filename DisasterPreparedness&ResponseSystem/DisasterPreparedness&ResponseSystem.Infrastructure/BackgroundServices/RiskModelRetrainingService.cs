using DisasterPreparedness_ResponseSystem.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.BackgroundServices
{
    /// <summary>
    /// Retrains the ML.NET risk model automatically once per day at a configured time (default 02:00 PKT).
    /// Uses the same training pipeline as the manual /api/Risk/train endpoint.
    /// </summary>
    public class RiskModelRetrainingService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<RiskModelRetrainingService> _logger;

        public RiskModelRetrainingService(
            IServiceScopeFactory scopeFactory,
            IConfiguration config,
            ILogger<RiskModelRetrainingService> logger)
        {
            _scopeFactory = scopeFactory;
            _config = config;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Risk model retraining service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                var delay = ComputeDelayUntilNextRun();
                _logger.LogInformation("Next risk-model retraining scheduled in {Hours:F1} hours.", delay.TotalHours);

                try
                {
                    await Task.Delay(delay, stoppingToken);
                    await RetrainAsync();
                }
                catch (OperationCanceledException) { break; }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during scheduled risk-model retraining.");
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                }
            }
        }

        private TimeSpan ComputeDelayUntilNextRun()
        {
            TimeZoneInfo pkTimeZone;
            try { pkTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Pakistan Standard Time"); }
            catch { pkTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Karachi"); }

            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, pkTimeZone);
            var scheduledHour = _config.GetValue<int?>("RiskModelRetraining:Hour") ?? 2;
            var scheduledMinute = _config.GetValue<int?>("RiskModelRetraining:Minute") ?? 0;

            var nextRun = now.Date.AddHours(scheduledHour).AddMinutes(scheduledMinute);
            if (now >= nextRun) nextRun = nextRun.AddDays(1);

            return nextRun - now;
        }

        private async Task RetrainAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var trainingService = scope.ServiceProvider.GetRequiredService<RiskTrainingService>();

            _logger.LogInformation("Starting scheduled risk-model retraining...");
            var result = await trainingService.TryTrainAsync();

            if (result.Success)
            {
                _logger.LogInformation("Scheduled risk-model retraining completed. Rows={Rows}, Positives={Positives}",
                    result.RowCount, result.PositiveRows);
            }
            else
            {
                _logger.LogWarning("Scheduled risk-model retraining skipped: {Error}", result.Error);
            }
        }
    }
}
