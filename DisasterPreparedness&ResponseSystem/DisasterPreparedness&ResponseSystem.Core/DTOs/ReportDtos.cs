using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.DTOs
{
    public record CreateReportDto(
        DisasterType Type,
        double Latitude,
        double Longitude,
        string LocationName,
        string Description,
        string? ImageUrl,
        string? ImageBase64
    );

    public record ReportResponseDto(
        int Id,
        int? DisasterId,
        string ReportedByUserId,
        string ReportedByName,
        DisasterType Type,
        string Description,
        double Latitude,
        double Longitude,
        string? ImageUrl,
        string LocationName,
        ReportStatus Status,
        DateTime CreatedAt
    );
    public record MergeIntoExistingDto(int DisasterId);
    public record CreateDisasterFromReportDto(
        SeverityLevel Severity,
        double? AffectedAreaRadiusKm
    );

    public record RejectReportDto(string? Reason);
}
