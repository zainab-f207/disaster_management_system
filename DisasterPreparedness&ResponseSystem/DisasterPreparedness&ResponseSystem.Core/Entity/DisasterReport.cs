using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class DisasterReport
    {
        public int Id { get; set; }
        public int? DisasterId { get; set; }
        public Disaster? Disaster { get; set; }
        public DisasterType Type { get; set; }
        public string ReportedByUserId { get; set; } = string.Empty;
        public ApplicationUser ReportedByUser { get; set; } = null!;
        public string Description { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public ReportStatus Status { get; set; } = ReportStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDuplicate { get; set; } = false;
    }
}
