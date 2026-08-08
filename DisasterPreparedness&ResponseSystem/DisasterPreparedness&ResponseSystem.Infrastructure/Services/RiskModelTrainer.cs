using DisasterPreparedness_ResponseSystem.Core.Models;
using Microsoft.ML;
using Microsoft.ML.Data;
using Microsoft.ML.Trainers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class WeatherInput
    {
        public float RainSum { get; set; }
        public float WindMax { get; set; }
        public float GustsMax { get; set; }
        public float TempMax { get; set; }
        public float ApparentTempMax { get; set; }
        public float HumidityMax { get; set; }
        public bool DisasterOccurred { get; set; }
    }

    public class RiskPrediction
    {
        [ColumnName("PredictedLabel")] public bool WillOccur { get; set; }
        [ColumnName("Probability")] public float Probability { get; set; }
        [ColumnName("Score")] public float Score { get; set; }
    }

    public class RiskModelTrainer
    {
        private static readonly string ModelPath = Path.Combine(AppContext.BaseDirectory, "risk_model.zip");
        private readonly MLContext _ml = new(seed: 42);
        private readonly SemaphoreSlim _trainLock = new(1, 1);

        public void Train(List<TrainingRow> rows)
        {
            _trainLock.Wait();
            try
            {
                var positives = rows.Where(r => r.DisasterOccurred).ToList();
                var negatives = rows.Where(r => !r.DisasterOccurred).ToList();

                if (positives.Count < 5)
                    throw new InvalidOperationException($"Only {positives.Count} positive examples — need at least 5 to evaluate reliably. Widen your GLIDE date range or add more cities.");
                if (negatives.Count == 0)
                    throw new InvalidOperationException("Training data contains no negative non-disaster examples. Cannot train a binary risk model.");

                var rnd = new Random(42);
                positives = positives.OrderBy(_ => rnd.Next()).ToList();
                negatives = negatives.OrderBy(_ => rnd.Next()).ToList();

                // Guarantee at least 20% of positives (min 2) land in the test set
                int posTestCount = Math.Max(2, (int)(positives.Count * 0.2));
                int negTestCount = Math.Max(2, (int)(negatives.Count * 0.2));

                var trainRows = positives.Skip(posTestCount).Concat(negatives.Skip(negTestCount)).ToList();
                var testRows = positives.Take(posTestCount).Concat(negatives.Take(negTestCount)).ToList();

                var trainView = _ml.Data.LoadFromEnumerable(trainRows.Select(ToInput));
                var testView = _ml.Data.LoadFromEnumerable(testRows.Select(ToInput));

                var pipeline = _ml.Transforms.Concatenate("Features",
                        nameof(WeatherInput.RainSum), nameof(WeatherInput.WindMax),
                        nameof(WeatherInput.GustsMax), nameof(WeatherInput.TempMax),
                        nameof(WeatherInput.ApparentTempMax), nameof(WeatherInput.HumidityMax))
                    .Append(_ml.Transforms.NormalizeMinMax("Features"))
                    .Append(_ml.BinaryClassification.Trainers.FastTree(
                        labelColumnName: nameof(WeatherInput.DisasterOccurred),
                        featureColumnName: "Features", numberOfLeaves: 20, numberOfTrees: 100));

                var model = pipeline.Fit(trainView);

                var metrics = _ml.BinaryClassification.Evaluate(model.Transform(testView),
                    labelColumnName: nameof(WeatherInput.DisasterOccurred));
                Console.WriteLine($"AUC: {metrics.AreaUnderRocCurve:F3}  Accuracy: {metrics.Accuracy:F3}  " +
                                   $"F1: {metrics.F1Score:F3}  (test set had {posTestCount} positive rows)");

                _ml.Model.Save(model, trainView.Schema, ModelPath);
            }
            finally
            {
                _trainLock.Release();
            }
        }

        private static WeatherInput ToInput(TrainingRow r) => new()
        {
            RainSum = r.RainSum,
            WindMax = r.WindMax,
            GustsMax = r.GustsMax,
            TempMax = r.TempMax,
            ApparentTempMax = r.ApparentTempMax,
            HumidityMax = r.HumidityMax,
            DisasterOccurred = r.DisasterOccurred,
        };

        public RiskPrediction Predict(WeatherInput input)
        {
            var model = _ml.Model.Load(ModelPath, out _);
            var engine = _ml.Model.CreatePredictionEngine<WeatherInput, RiskPrediction>(model);
            return engine.Predict(input);
        }

        public bool ModelExists() => File.Exists(ModelPath);
    }
}
