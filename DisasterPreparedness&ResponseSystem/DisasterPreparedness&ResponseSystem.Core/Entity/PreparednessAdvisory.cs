using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class PreparednessAdvisory
    {
        public int Id { get; set; }
        public string City { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public DisasterType Type { get; set; }
        public SeverityLevel Severity { get; set; }
        public DateTime ForecastFor { get; set; }       // the day the risk is expected
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool Acknowledged { get; set; } = false;  // admin/responder dismissed it
        public string? AcknowledgedByUserId { get; set; }
    }
}
