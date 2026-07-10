using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Models
{
    // Maps to Open-Meteo API JSON response
    // API URL: https://api.open-meteo.com/v1/forecast?latitude=31.5&longitude=74.3
    //          &current=temperature_2m,precipitation,wind_speed_10m,rain
    public class WeatherApiResponse
    {
        public CurrentWeather? Current { get; set; }
    }

    public class CurrentWeather
    {
        public double Temperature_2m { get; set; }          
        public double Apparent_Temperature { get; set; }    
        public double Precipitation { get; set; }           
        public double Rain { get; set; }                    
        public double Snowfall { get; set; }              
        public double Wind_Speed_10m { get; set; }          
        public double Wind_Gusts_10m { get; set; }         
        public int Relative_Humidity_2m { get; set; }       
        public double Uv_Index { get; set; }                
        public int Weather_Code { get; set; }
    }
}
