using System;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.DTOs
{
    public record ResponderAssignmentResponseDto(
        int Id,
        int DisasterId,
        int ResponderOrganizationId,
        string ResponderOrganizationName,
        string? AssignedUserId,
        AssignmentStatus Status,
        AssignmentMethod Method,
        DateTime AssignedAt
    );
}
