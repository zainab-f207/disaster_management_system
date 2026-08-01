using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Models
{
    // Maps to Open-Meteo daily forecast
    // https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..
    //   &daily=precipitation_sum,windspeed_10m_max,windgusts_10m_max,
    //          temperature_2m_max,apparent_temperature_max,relative_humidity_2m_max,uv_index_max
    //   &forecast_days=3&timezone=Asia/Karachi
    public class WeatherForecastApiResponse
    {
        public DailyForecast? Daily { get; set; }
    }

    public class DailyForecast
    {
        public List<string> Time { get; set; } = new();
        public List<double> Precipitation_Sum { get; set; } = new();
        public List<double> Windspeed_10m_Max { get; set; } = new();
        public List<double> Windgusts_10m_Max { get; set; } = new();
        public List<double> Temperature_2m_Max { get; set; } = new();
        public List<double> Apparent_Temperature_Max { get; set; } = new();
        public List<int> Relative_Humidity_2m_Max { get; set; } = new();
        public List<double> Uv_Index_Max { get; set; } = new();
    }
}
