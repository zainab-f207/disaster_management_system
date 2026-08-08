using DisasterPreparedness_ResponseSystem.Core.Models;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class RiskTrainingService
    {
        private readonly HistoricalDatasetBuilder _datasetBuilder;
        private readonly GlideEventParser _glideParser;
        private readonly RiskModelTrainer _trainer;
        private readonly AppDbContext _db;
        private readonly ILogger<RiskTrainingService> _logger;

        public RiskTrainingService(
            HistoricalDatasetBuilder datasetBuilder,
            GlideEventParser glideParser,
            RiskModelTrainer trainer,
            AppDbContext db,
            ILogger<RiskTrainingService> logger)
        {
            _datasetBuilder = datasetBuilder;
            _glideParser = glideParser;
            _trainer = trainer;
            _db = db;
            _logger = logger;
        }

        public async Task<TrainingResult> TryTrainAsync()
        {
            _logger.LogInformation("Starting risk-model training run...");

            var knownDisasters = await _glideParser.GetKnownDisastersAsync();

            var since = DateTime.UtcNow.AddYears(-3);
            var localDisasters = await _db.Disasters
                .Where(d => d.ReportedAt >= since)
                .ToListAsync();

            var dataset = await _datasetBuilder.BuildDatasetAsync(knownDisasters, localDisasters);

            if (dataset.Count < 30)
            {
                const string msg = "Not enough historical weather rows collected. Check weather/archive API availability.";
                _logger.LogWarning("Risk-model training skipped: {Message}", msg);
                return TrainingResult.Failed(msg);
            }

            var positives = dataset.Count(r => r.DisasterOccurred);
            if (positives == 0)
            {
                const string msg = "Training data contains no positive disaster examples. Check GLIDE CSV parsing or verify at least one local disaster.";
                _logger.LogWarning("Risk-model training skipped: {Message}", msg);
                return TrainingResult.Failed(msg);
            }

            _trainer.Train(dataset);
            _logger.LogInformation("Risk-model training completed. Rows={Rows}, Positives={Positives}", dataset.Count, positives);
            return TrainingResult.Ok(dataset.Count, positives);
        }
    }

    public record TrainingResult(bool Success, string? Error, int RowCount, int PositiveRows)
    {
        public static TrainingResult Ok(int rowCount, int positiveRows) =>
            new(true, null, rowCount, positiveRows);

        public static TrainingResult Failed(string error) =>
            new(false, error, 0, 0);
    }
}
