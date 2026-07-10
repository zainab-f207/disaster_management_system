using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.Entity;
public enum AlertAudience { AllUsers, AreaResidents, Responders, Admins }
public class Alert
    {
    public int Id { get; set; }
    public int DisasterId { get; set; }
    public Disaster Disaster { get; set; } = null!;
    public string Message { get; set; } = string.Empty;
    public SeverityLevel Severity { get; set; }
    public AlertAudience Audience { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

