using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class NominatimResult
    {
        public string? Lat { get; set; }
        public string? Lon { get; set; }
        public string? DisplayName { get; set; }
        public NominatimAddress? Address { get; set; }
    }
}
