using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Models
{
    public class MonitoringConfig
    {
        public int WeatherCheckIntervalMinutes { get; set; }
        public int EarthquakeCheckIntervalMinutes { get; set; }
        public List<CityConfig> PakistanCities { get; set; } = new();
        public ThresholdConfig Thresholds { get; set; } = new();
    }

    public class CityConfig
    {
        public string Name { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }

    public class ThresholdConfig
    {
        public double RainfallMmPerHour { get; set; }
        public double WindSpeedKmh { get; set; }
        public double WindGustsKmh { get; set; }          
        public double TemperatureCelsius { get; set; }
        public double ApparentTemperatureCelsius { get; set; }  
        public int HumidityPercent { get; set; }          
        public double UvIndexHigh { get; set; }           
        public double AqiUnhealthy { get; set; }          
        public double EarthquakeMagnitude { get; set; }
    }
}
