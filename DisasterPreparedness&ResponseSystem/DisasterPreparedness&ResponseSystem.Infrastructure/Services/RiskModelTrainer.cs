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
            var positives = rows.Count(r => r.DisasterOccurred);
            var negatives = rows.Count - positives;

            if (positives == 0)
                throw new InvalidOperationException("Training data contains no positive disaster examples. Cannot train a binary risk model.");
            if (negatives == 0)
                throw new InvalidOperationException("Training data contains no negative non-disaster examples. Cannot train a binary risk model.");

            var data = rows.Select(r => new WeatherInput
            {
                RainSum = r.RainSum,
                WindMax = r.WindMax,
                GustsMax = r.GustsMax,
                TempMax = r.TempMax,
                ApparentTempMax = r.ApparentTempMax,
                HumidityMax = r.HumidityMax,
                DisasterOccurred = r.DisasterOccurred,
            });

            var dataView = _ml.Data.LoadFromEnumerable(data);
            var split = _ml.Data.TrainTestSplit(dataView, testFraction: 0.2,
                samplingKeyColumnName: nameof(WeatherInput.DisasterOccurred));

            var pipeline = _ml.Transforms.Concatenate("Features",
                    nameof(WeatherInput.RainSum), nameof(WeatherInput.WindMax),
                    nameof(WeatherInput.GustsMax), nameof(WeatherInput.TempMax),
                    nameof(WeatherInput.ApparentTempMax), nameof(WeatherInput.HumidityMax))
                .Append(_ml.Transforms.NormalizeMinMax("Features"))
                .Append(_ml.BinaryClassification.Trainers.FastTree(
                    labelColumnName: nameof(WeatherInput.DisasterOccurred),
                    featureColumnName: "Features", numberOfLeaves: 20, numberOfTrees: 100));

            var model = pipeline.Fit(split.TrainSet);

            try
            {
                var metrics = _ml.BinaryClassification.Evaluate(model.Transform(split.TestSet),
                    labelColumnName: nameof(WeatherInput.DisasterOccurred));
                Console.WriteLine($"AUC: {metrics.AreaUnderRocCurve:F3}  Accuracy: {metrics.Accuracy:F3}");
            }
            catch (ArgumentOutOfRangeException ex) when (ex.Message.Contains("AUC is not defined", StringComparison.OrdinalIgnoreCase) ||
                                                         ex.ParamName == "PosSample")
            {
                Console.WriteLine("Warning: test split contained no positive examples; skipping AUC evaluation. Model was still trained.");
            }

            _ml.Model.Save(model, dataView.Schema, ModelPath);
            }
            finally
            {
                _trainLock.Release();
            }
        }

        public RiskPrediction Predict(WeatherInput input)
        {
            var model = _ml.Model.Load(ModelPath, out _);
            var engine = _ml.Model.CreatePredictionEngine<WeatherInput, RiskPrediction>(model);
            return engine.Predict(input);
        }

        public bool ModelExists() => File.Exists(ModelPath);
    }
}
