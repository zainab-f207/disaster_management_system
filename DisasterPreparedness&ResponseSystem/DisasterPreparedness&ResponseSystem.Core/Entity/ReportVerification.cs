using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class ReportVerification
    {
        public int Id { get; set; }
        public int ReportId { get; set; }
        public DisasterReport Report { get; set; } = null!;
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = null!;
        public bool Confirmed { get; set; } 
        public DateTime VotedAt { get; set; } = DateTime.UtcNow;
    }
}
