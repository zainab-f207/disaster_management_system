using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class NominatimAddress
    {
        public string? City { get; set; }
        public string? Town { get; set; }
        public string? Village { get; set; }
        public string? County { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
    }
}
