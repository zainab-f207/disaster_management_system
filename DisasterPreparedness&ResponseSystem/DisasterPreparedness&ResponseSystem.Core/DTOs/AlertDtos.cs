using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.DTOs
{
    public class RealTimeAlertDto
    {
        public int DisasterId { get; set; }
        public string DisasterType { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;  
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Description { get; set; } = string.Empty;
        public string AffectedCity { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? AssignedOrganization { get; set; }
        public string? AssignedOrgContact { get; set; }
    }

    public class AssignmentUpdateDto
    {
        public int AssignmentId { get; set; }
        public int DisasterId { get; set; }
        public string OrganizationName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;    
        public string Method { get; set; } = string.Empty;    
        public DateTime UpdatedAt { get; set; }
    }

    public class NewReportNotificationDto
    {
        public int ReportId { get; set; }
        public string ReportedBy { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
