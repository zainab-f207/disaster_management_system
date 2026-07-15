using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class Disaster
    {
        public int Id { get; set; }
        public DisasterType Type { get; set; }
        public SeverityLevel Severity { get; set; }
        public DisasterStatus Status { get; set; } = DisasterStatus.Pending;
        public DisasterSource Source { get; set; }
        public string SourceReference { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double? AffectedAreaRadiusKm { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime ReportedAt { get; set; } = DateTime.UtcNow;
        public DateTime? VerifiedAt { get; set; }
        public string? VerifiedByUserId { get; set; }
        public ApplicationUser? VerifiedByUser { get; set; }
        public ICollection<DisasterReport> Reports { get; set; } = new List<DisasterReport>();
        public ICollection<ResponderAssignment> Assignments { get; set; } = new List<ResponderAssignment>();
        public ICollection<Alert> Alerts { get; set; } = new List<Alert>();
    }
}
