using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.DTOs
{
    public record CompleteAssignmentDto(
    string CompletionNotes,
    string? CompletionPhotoBase64
);
    public record OverrideAssignmentDto(int NewOrganizationId);
    public record UpdateAssignmentStatusDto(AssignmentStatus Status);

    public record AssignmentResponseDto(
        int Id,
        int DisasterId,
        int ResponderOrganizationId,
        string OrganizationName,
        AssignmentStatus Status,
        AssignmentMethod Method,
        DateTime AssignedAt,
        string? CompletionNotes,
    string? CompletionPhotoBase64,
    DateTime? CompletedAt
    );
}
