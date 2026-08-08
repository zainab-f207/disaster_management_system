using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Core.Models;
using DisasterPreparedness_ResponseSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RiskController : ControllerBase
    {
        private readonly RiskTrainingService _trainingService;
        private readonly RiskModelTrainer _trainer;
        private readonly IWeatherForecastApiService _forecastApi;
        private readonly SeismicHazardService _seismicService;
        private readonly MonitoringConfig _config;

        public RiskController(RiskTrainingService trainingService,
            RiskModelTrainer trainer, IWeatherForecastApiService forecastApi,
            SeismicHazardService seismicService,
            Microsoft.Extensions.Options.IOptions<MonitoringConfig> config)
        {
            _trainingService = trainingService;
            _trainer = trainer; _forecastApi = forecastApi;
            _seismicService = seismicService; _config = config.Value;
        }

        // Call this manually when needed. The same logic also runs daily via RiskModelRetrainingService.
        [Authorize(Roles = "Admin")]
        [HttpPost("train")]
        public async Task<IActionResult> TrainModel()
        {
            var trained = await _trainingService.TryTrainAsync();
            if (!trained.Success)
                return BadRequest(new { Error = trained.Error });

            return Ok(new { Message = "Model trained on real historical data.", trained.RowCount, trained.PositiveRows });
        }

        [AllowAnonymous]
        [HttpGet("seismic")]
        public async Task<IActionResult> GetSeismicHazards()
        {
            return Ok(await _seismicService.GetHazardsAsync());
        }

        [AllowAnonymous]
        [HttpGet("seismic")]
        public async Task<IActionResult> GetSeismicHazards([FromServices] SeismicHazardService seismicService)
        {
            return Ok(await seismicService.GetHazardsAsync());
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetRiskScores()
        {
            if (!_trainer.ModelExists())
                return Ok(new { Message = "Model not trained yet. POST /api/risk/train first (Admin only)." });

            var results = new List<object>();
            foreach (var city in _config.PakistanCities)
            {
                var daily = await _forecastApi.GetDailyForecastAsync(city.Latitude, city.Longitude, 3);
                if (daily == null || daily.Time.Count < 2) continue;

                var input = new WeatherInput
                {
                    RainSum = (float)daily.Precipitation_Sum.ElementAtOrDefault(1),
                    WindMax = (float)daily.Windspeed_10m_Max.ElementAtOrDefault(1),
                    GustsMax = (float)daily.Windgusts_10m_Max.ElementAtOrDefault(1),
                    TempMax = (float)daily.Temperature_2m_Max.ElementAtOrDefault(1),
                    ApparentTempMax = (float)daily.Apparent_Temperature_Max.ElementAtOrDefault(1),
                    HumidityMax = daily.Relative_Humidity_2m_Max.ElementAtOrDefault(1),
                };

                var pred = _trainer.Predict(input);
                results.Add(new
                {
                    City = city.Name,
                    RiskProbability = Math.Round(pred.Probability * 100, 1),
                    RiskLevel = pred.Probability >= 0.7 ? "High" : pred.Probability >= 0.4 ? "Medium" : "Low",
                });
            }

            return Ok(results.OrderByDescending(r => ((dynamic)r).RiskProbability));
        }
    }

}
