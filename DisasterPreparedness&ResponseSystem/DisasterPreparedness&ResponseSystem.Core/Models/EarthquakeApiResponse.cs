using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Models
{
    // Maps to USGS GeoJSON earthquake feed
    // API URL: https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson
    //          &minmagnitude=4.5&minlatitude=23&maxlatitude=37&minlongitude=60&maxlongitude=77
    public class EarthquakeApiResponse
    {
        public List<EarthquakeFeature> Features { get; set; } = new();
    }

    public class EarthquakeFeature
    {
        public EarthquakeProperties? Properties { get; set; }
        public EarthquakeGeometry? Geometry { get; set; }
    }

    public class EarthquakeProperties
    {
        public double Mag { get; set; }           
        public string? Place { get; set; }        
        public long Time { get; set; }            
        public string? Title { get; set; }
    }

    public class EarthquakeGeometry
    {
        public List<double> Coordinates { get; set; } = new();
        
    }
}
