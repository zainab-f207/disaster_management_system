using DisasterPreparedness_ResponseSystem.Core.DTOs;
using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using DisasterPreparedness_ResponseSystem.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AssignmentsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IResponderAssignmentService _assignmentService;
        private readonly IAlertService _alertService;

        public AssignmentsController(AppDbContext db, IResponderAssignmentService assignmentService, IAlertService alertService)
        {
            _db = db;
            _assignmentService = assignmentService;
            _alertService = alertService;
        }

        /// <summary>
        /// Retrieve all responder assignments for a specific disaster.
        /// Open to all users. Shows which organizations have been assigned and their current status.
        /// </summary>
        /// <remarks>
        /// A disaster typically has one primary assignment (auto-assigned nearest responder).
        /// Additional assignments may exist if Admin creates manual overrides or adds backup responders.
        /// Status values: Assigned, EnRoute, Arrived, OnScene, OperationStarted, OnSite, Completed, Cancelled.
        /// </remarks>
        /// <param name="disasterId">The disaster ID</param>
        /// <returns>List of assignments for the disaster with organization details and status</returns>
        // GET /api/assignments/disaster/5
        [HttpGet("disaster/{disasterId}")]
        public async Task<IActionResult> GetByDisaster(int disasterId)
        {
            var assignments = await _db.ResponderAssignments
                .Where(a => a.DisasterId == disasterId)
                .Include(a => a.ResponderOrganization)
                .Select(a => new AssignmentResponseDto(
                    a.Id, a.DisasterId, a.ResponderOrganizationId,
                    a.ResponderOrganization.Name, a.Status, a.Method, a.AssignedAt, a.CompletionNotes, a.CompletionPhotoBase64, a.CompletedAt))
                .ToListAsync();

            return Ok(assignments);
        }

        /// <summary>
        /// Manually override a disaster assignment to a different responder organization.
        /// Restricted to Admin role.
        /// </summary>
        /// <param name="assignmentId">The existing assignment ID to override</param>
        /// <param name="dto">New organization ID</param>
        /// <returns>Updated assignment with new organization details</returns>
        // PUT /api/assignments/5/override  — admin manually reassigns
        [Authorize(Roles = "Admin")]
        [HttpPut("{assignmentId}/override")]
        public async Task<IActionResult> OverrideAssignment(int assignmentId, [FromBody] OverrideAssignmentDto dto)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _assignmentService.OverrideAssignmentAsync(
    assignmentId, dto.NewOrganizationId, adminId!);
            return Ok(new AssignmentResponseDto(
                result.Id, result.DisasterId, result.ResponderOrganizationId,
                "", result.Status, result.Method, result.AssignedAt, result.CompletionNotes, result.CompletionPhotoBase64, result.CompletedAt));
        }

        /// <summary>
        /// Update the current status of a responder assignment.
        /// Restricted to Admin and Responder roles.
        /// </summary>
        /// <param name="id">The assignment ID</param>
        /// <param name="dto">New assignment status</param>
        /// <returns>Updated assignment with new status</returns>
        [Authorize(Roles = "Admin,Responder")]
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateAssignmentStatus(int id, [FromBody] UpdateAssignmentStatusDto dto)
        {
            var assignment = await _db.ResponderAssignments.FindAsync(id);
            if (assignment == null) return NotFound();

            assignment.Status = dto.Status;
            await _db.SaveChangesAsync();
            await _alertService.SendAssignmentUpdateAsync(assignment);

            return Ok(new AssignmentResponseDto(
    assignment.Id, assignment.DisasterId, assignment.ResponderOrganizationId,
    "", assignment.Status, assignment.Method, assignment.AssignedAt, assignment.CompletionNotes, assignment.CompletionPhotoBase64, assignment.CompletedAt));
        }

        [Authorize(Roles = "Admin,Responder")]
        [HttpPost("{id}/complete")]
        public async Task<IActionResult> CompleteWithProof(
    int id, [FromBody] CompleteAssignmentDto dto)
        {
            var assignment = await _db.ResponderAssignments.FindAsync(id);
            if (assignment == null) return NotFound();

            if (assignment.Status == AssignmentStatus.Completed)
                return BadRequest(new { Error = "Assignment is already completed." });

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            assignment.Status = AssignmentStatus.Completed;
            assignment.CompletionNotes = dto.CompletionNotes;
            assignment.CompletionPhotoBase64 = dto.CompletionPhotoBase64;
            assignment.CompletedAt = DateTime.UtcNow;
            assignment.CompletedByUserId = userId;

            await _db.SaveChangesAsync();

            await _alertService.SendAssignmentUpdateAsync(assignment);

            return Ok(new
            {
                Message = "Assignment completed with proof submitted.",
                Assignment = new AssignmentResponseDto(
                    assignment.Id,
                    assignment.DisasterId,
                    assignment.ResponderOrganizationId,
                    "",
                    assignment.Status,
                    assignment.Method,
                    assignment.AssignedAt,
                    assignment.CompletionNotes,
                    assignment.CompletionPhotoBase64,
                    assignment.CompletedAt
                )
            });
        }

        /// <summary>
        /// Submit a GPS location ping for an active assignment.
        /// Calculates Haversine distance from disaster location and auto-transitions status:
        /// EnRoute -> Arrived (<=100m), Arrived -> OnScene (<=20m).
        /// </summary>
        [Authorize(Roles = "Admin,Responder")]
        [HttpPost("{id}/location")]
        public async Task<IActionResult> SubmitLocationPing(int id, [FromBody] LocationPingDto dto)
        {
            var assignment = await _db.ResponderAssignments
                .Include(a => a.Disaster)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (assignment == null) return NotFound();

            // Ignore pings for terminal states
            if (assignment.Status == AssignmentStatus.Completed ||
                assignment.Status == AssignmentStatus.Cancelled)
                return Ok(new { status = assignment.Status.ToString(), distanceMeters = (double?)null, autoTransitioned = false });

            // Store ping
            var ping = new ResponderLocationPing
            {
                AssignmentId = id,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                SpeedKmh = dto.SpeedKmh,
                AccuracyMeters = dto.AccuracyMeters,
                RecordedAt = DateTime.UtcNow,
            };
            _db.ResponderLocationPings.Add(ping);

            // Haversine distance calculation
            var disLat = assignment.Disaster.Latitude;
            var disLon = assignment.Disaster.Longitude;
            var distMeters = HaversineMeters(dto.Latitude, dto.Longitude, disLat, disLon);

            bool autoTransitioned = false;
            var oldStatus = assignment.Status;

            // Auto-transition logic
            if (assignment.Status == AssignmentStatus.EnRoute && distMeters <= 100)
            {
                assignment.Status = AssignmentStatus.Arrived;
                autoTransitioned = true;
            }
            else if (assignment.Status == AssignmentStatus.Arrived && distMeters <= 20)
            {
                assignment.Status = AssignmentStatus.OnScene;
                autoTransitioned = true;
            }

            await _db.SaveChangesAsync();

            if (autoTransitioned)
                await _alertService.SendAssignmentUpdateAsync(assignment);

            return Ok(new
            {
                status = assignment.Status.ToString(),
                previousStatus = oldStatus.ToString(),
                distanceMeters = Math.Round(distMeters, 1),
                autoTransitioned,
            });
        }

        /// <summary>
        /// Responder confirms they have started operations at the incident scene.
        /// Transitions status from OnScene -> OperationStarted.
        /// </summary>
        [Authorize(Roles = "Admin,Responder")]
        [HttpPut("{id}/start-operation")]
        public async Task<IActionResult> StartOperation(int id)
        {
            var assignment = await _db.ResponderAssignments.FindAsync(id);
            if (assignment == null) return NotFound();

            if (assignment.Status != AssignmentStatus.OnScene)
                return BadRequest(new { Error = "Can only start operation when status is OnScene." });

            assignment.Status = AssignmentStatus.OperationStarted;
            await _db.SaveChangesAsync();
            await _alertService.SendAssignmentUpdateAsync(assignment);

            return Ok(new { status = assignment.Status.ToString() });
        }

        /// <summary>
        /// Admin-only endpoint returning all active assignments with their latest GPS ping.
        /// Used by the Live Tracking admin view, polled every 10 seconds.
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpGet("live")]
        public async Task<IActionResult> GetLiveAssignments()
        {
            var activeStatuses = new[]
            {
                AssignmentStatus.Assigned, AssignmentStatus.EnRoute,
                AssignmentStatus.Arrived, AssignmentStatus.OnScene,
                AssignmentStatus.OperationStarted, AssignmentStatus.OnSite
            };

            var assignments = await _db.ResponderAssignments
                .Where(a => activeStatuses.Contains(a.Status))
                .Include(a => a.ResponderOrganization)
                .Include(a => a.Disaster)
                .ToListAsync();

            // Get the latest ping for each assignment in a single query
            var assignmentIds = assignments.Select(a => a.Id).ToList();
            var latestPings = await _db.ResponderLocationPings
                .Where(p => assignmentIds.Contains(p.AssignmentId))
                .GroupBy(p => p.AssignmentId)
                .Select(g => g.OrderByDescending(p => p.RecordedAt).First())
                .ToListAsync();

            var pingByAssignment = latestPings.ToDictionary(p => p.AssignmentId);

            var result = assignments.Select(a =>
            {
                pingByAssignment.TryGetValue(a.Id, out var ping);
                double? dist = null;
                if (ping != null)
                    dist = Math.Round(HaversineMeters(ping.Latitude, ping.Longitude, a.Disaster.Latitude, a.Disaster.Longitude), 1);

                return new AssignmentLiveDto(
                    a.Id,
                    a.DisasterId,
                    a.Disaster.Latitude,
                    a.Disaster.Longitude,
                    a.Disaster.Type.ToString(),
                    a.ResponderOrganizationId,
                    a.ResponderOrganization.Name,
                    a.Status,
                    a.AssignedAt,
                    ping?.Latitude,
                    ping?.Longitude,
                    ping?.RecordedAt,
                    dist
                );
            }).ToList();

            return Ok(result);
        }

        // ─── Helpers ──────────────────────────────────────────────────────────

        /// <summary>
        /// Haversine great-circle distance in metres between two lat/lon coordinates.
        /// </summary>
        private static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6_371_000; // Earth radius in metres
            var dLat = ToRad(lat2 - lat1);
            var dLon = ToRad(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                  + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
                  * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }

        private static double ToRad(double deg) => deg * Math.PI / 180.0;
    }
}
