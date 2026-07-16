using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class ResponderAssignment
    {
        public int Id { get; set; }
        public int DisasterId { get; set; }
        public Disaster Disaster { get; set; } = null!;
        public int ResponderOrganizationId { get; set; }
        public ResponderOrganization ResponderOrganization { get; set; } = null!;
        public string? AssignedUserId { get; set; }
        public ApplicationUser? AssignedUser { get; set; }
        public AssignmentStatus Status { get; set; } = AssignmentStatus.Assigned;
        public AssignmentMethod Method { get; set; } = AssignmentMethod.Auto;
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public string? CompletionPhotoBase64 { get; set; }  
        public string? CompletionNotes { get; set; }         
        public DateTime? CompletedAt { get; set; }           
        public string? CompletedByUserId { get; set; }

        public double? CurrentLatitude { get; set; }
        public double? CurrentLongitude { get; set; }
        public DateTime? LocationUpdatedAt { get; set; }
        public bool OperationStarted { get; set; }
        public DateTime? OperationStartedAt { get; set; }
    }
}
