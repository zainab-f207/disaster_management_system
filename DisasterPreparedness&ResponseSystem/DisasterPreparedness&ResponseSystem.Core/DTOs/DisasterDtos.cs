using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.DTOs
{
    public record CreateDisasterDto(
        DisasterType Type,
        SeverityLevel Severity,
        double Latitude,
        double Longitude,
        double? AffectedAreaRadiusKm,
        string Description
    );

    public record DisasterResponseDto(
        int Id,
        DisasterType Type,
        SeverityLevel Severity,
        DisasterStatus Status,
        DisasterSource Source,
        double Latitude,
        double Longitude,
        string Description,
        DateTime ReportedAt,
        DateTime? VerifiedAt
    );

    public record CreateAdminDisasterDto(
        DisasterType Type,
        SeverityLevel Severity,
        double Latitude,
        double Longitude,
        string Description,
        string LocationName,
        double? AffectedAreaRadiusKm,
        string? Source  
    );

    public record UpdateDisasterStatusDto(DisasterStatus Status);
}
