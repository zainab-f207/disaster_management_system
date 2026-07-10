using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class SafetyCheck
    {
        public int Id { get; set; }
        public int DisasterId { get; set; }
        public Disaster Disaster { get; set; } = null!;
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = null!;
        public DateTime MarkedAt { get; set; } = DateTime.UtcNow;
    }
}
