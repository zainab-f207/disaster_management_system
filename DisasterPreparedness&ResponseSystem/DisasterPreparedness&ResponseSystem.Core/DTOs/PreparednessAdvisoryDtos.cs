using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.DTOs
{
    public record PreparednessAdvisoryDto(
        int Id,
        string City,
        double Latitude,
        double Longitude,
        DisasterType Type,
        SeverityLevel Severity,
        DateTime ForecastFor,
        string Message,
        DateTime CreatedAt,
        bool Acknowledged
    );
    public record RealTimeAdvisoryDto(
        int AdvisoryId,
        string City,
        string Type,
        string Severity,
        DateTime ForecastFor,
        string Message,
        double Latitude,
        double Longitude
    );
}
