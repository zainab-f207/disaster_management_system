using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.DTOs
{
    public record CreateOrganizationDto(
        string Name,
        OrganizationType Type,
        string ContactNumber,
        double BaseLatitude,
        double BaseLongitude
    );

    public record UpdateOrganizationDto(
        string Name,
        string ContactNumber,
        double BaseLatitude,
        double BaseLongitude,
        bool IsActive
    );

    public record OrganizationResponseDto(
        int Id,
        string Name,
        OrganizationType Type,
        string ContactNumber,
        double BaseLatitude,
        double BaseLongitude,
        bool IsActive
    );
}
