using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class AirQualityData
    {
        public double European_Aqi { get; set; }  
        public double Us_Aqi { get; set; }         
        public double Pm2_5 { get; set; }          
        public double Pm10 { get; set; }          
    }
}
