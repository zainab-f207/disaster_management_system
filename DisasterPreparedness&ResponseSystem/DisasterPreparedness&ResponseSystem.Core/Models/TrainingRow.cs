using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Models
{
    public class TrainingRow
    {
        public string City { get; set; } = "";
        public string Date { get; set; } = "";
        public string Type { get; set; } = ""; 
        public float RainSum { get; set; }
        public float WindMax { get; set; }
        public float GustsMax { get; set; }
        public float TempMax { get; set; }
        public float ApparentTempMax { get; set; }
        public float HumidityMax { get; set; }
        public bool DisasterOccurred { get; set; } 
    }
}
