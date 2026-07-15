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

    /// <summary>GPS ping sent by a responder device every ~15 seconds.</summary>
    public record LocationPingDto(
        double Latitude,
        double Longitude,
        double? SpeedKmh,
        double? AccuracyMeters
    );

    /// <summary>Returned by the live tracking endpoint for admin view.</summary>
    public record AssignmentLiveDto(
        int Id,
        int DisasterId,
        double DisasterLatitude,
        double DisasterLongitude,
        string DisasterType,
        int ResponderOrganizationId,
        string OrganizationName,
        AssignmentStatus Status,
        DateTime AssignedAt,
        // Latest GPS ping — null if no ping received yet
        double? ResponderLatitude,
        double? ResponderLongitude,
        DateTime? LastPingAt,
        double? DistanceMeters
    );

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

