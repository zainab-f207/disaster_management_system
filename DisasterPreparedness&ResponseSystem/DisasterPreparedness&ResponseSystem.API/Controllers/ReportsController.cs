using DisasterPreparedness_ResponseSystem.Core.DTOs;
using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
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
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IReportService _reportService;
        private readonly IAlertService _alertService;


        public ReportsController(AppDbContext db, IReportService reportService, IAlertService alertService)
        {
            _db = db;
            _reportService = reportService;
            _alertService = alertService;
        }

        /// <summary>
        /// Submit a new disaster report. Any logged-in user (Citizen, Responder, or Admin) can submit.
        /// Admin is notified in real-time via SignalR.
        /// </summary>
        /// <remarks>
        /// Latitude must be in range 23–37 (Pakistan range). Longitude must be in range 60–77.
        /// Report status begins as "Pending" and requires Admin verification.
        /// </remarks>
        /// <param name="dto">The disaster report details (latitude, longitude, description, etc.)</param>
        /// <returns>Created report with ID and timestamps</returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateReportDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
if (string.IsNullOrEmpty(userId))
    return Unauthorized();
var user = await _db.Users.FindAsync(userId);
var report = await _reportService.CreateReportAsync(userId, dto);
await _alertService.SendNewReportNotificationAsync(report, user?.FullName ?? "Citizen");
            return CreatedAtAction(nameof(GetById), new { id = report.Id }, new ReportResponseDto(
                report.Id, report.DisasterId, report.ReportedByUserId,
                user?.FullName ?? "Unknown", report.Type, report.Description,
                report.Latitude, report.Longitude, report.ImageUrl, report.LocationName,
                report.Status, report.CreatedAt));
        }

        /// <summary>
        /// Retrieve a specific disaster report by ID.
        /// </summary>
        /// <param name="id">The disaster report ID</param>
        /// <returns>Report details including location, description, and status</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var report = await _db.DisasterReports
                .Include(r => r.ReportedByUser)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (report == null) return NotFound();

            return Ok(new ReportResponseDto(
                report.Id, report.DisasterId, report.ReportedByUserId,
                report.ReportedByUser.FullName, report.Type, report.Description,
                report.Latitude, report.Longitude, report.ImageUrl, report.LocationName,
                report.Status, report.CreatedAt));
        }

        /// <summary>
        /// Get all disaster reports with optional filtering by status.
        /// Restricted to Admin role. Used to review pending reports and manage verification workflow.
        /// </summary>
        /// <remarks>
        /// Status values: Pending, Verified, Rejected, Merged.
        /// If no status filter is provided, returns all reports sorted by most recent first.
        /// </remarks>
        /// <param name="status">Optional: Filter reports by status (Pending, Verified, Rejected, Merged)</param>
        /// <returns>List of reports matching the filter criteria</returns>
        // GET /api/reports?status=Pending  — admin review queue
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] ReportStatus? status, [FromQuery] string? userId)
        {
            var query = _db.DisasterReports.Include(r => r.ReportedByUser).AsQueryable();
            if (status.HasValue) query = query.Where(r => r.Status == status);
            if (!string.IsNullOrEmpty(userId)) query = query.Where(r => r.ReportedByUserId == userId);
 
            var reports = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReportResponseDto(
                    r.Id, r.DisasterId, r.ReportedByUserId, r.ReportedByUser != null ? (r.ReportedByUser.FullName ?? "Unknown") : "Unknown",
                    r.Type, r.Description, r.Latitude, r.Longitude, r.ImageUrl, r.LocationName ?? "Unknown", r.Status, r.CreatedAt))
                .ToListAsync();
 
            return Ok(reports);
        }

        /// <summary>
        /// Get reports created by the currently logged-in user.
        /// </summary>
        [HttpGet("my")]
        public async Task<IActionResult> GetMyReports()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var reports = await _db.DisasterReports
                .Include(r => r.ReportedByUser)
                .Where(r => r.ReportedByUserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReportResponseDto(
                    r.Id, r.DisasterId, r.ReportedByUserId, r.ReportedByUser != null ? (r.ReportedByUser.FullName ?? "Unknown") : "Unknown",
                    r.Type, r.Description, r.Latitude, r.Longitude, r.ImageUrl, r.LocationName ?? "Unknown", r.Status, r.CreatedAt))
                .ToListAsync();

            return Ok(reports);
        }

        /// <summary>
        /// Find pending disaster reports near a given location.
        /// Restricted to Admin role. Used to detect potential duplicate reports before merging.
        /// </summary>
        /// <remarks>
        /// Returns all pending reports within the specified radius (in kilometers) of the given coordinates.
        /// Helps Admin identify related incidents that should be merged into a single disaster.
        /// </remarks>
        /// <param name="lat">Latitude of the center point (Pakistan: 23–37)</param>
        /// <param name="lon">Longitude of the center point (Pakistan: 60–77)</param>
        /// <param name="radiusKm">Search radius in kilometers (default: 5 km)</param>
        /// <returns>List of nearby pending reports within the radius</returns>
        // GET /api/reports/nearby?lat=31.5&lon=74.3&radiusKm=5  — admin checks for duplicate reports before merging
        [Authorize(Roles = "Admin")]
        [HttpGet("nearby")]
        public async Task<IActionResult> GetNearby([FromQuery] double lat, [FromQuery] double lon, [FromQuery] double radiusKm = 5)
        {
            var reports = await _reportService.GetNearbyPendingReportsAsync(lat, lon, radiusKm);
            return Ok(reports);
        }

        /// <summary>
        /// Link a pending report to an existing verified disaster.
        /// Restricted to Admin role. Use when a report describes an already-tracked disaster.
        /// </summary>
        /// <remarks>
        /// This consolidates related reports into one disaster record.
        /// The report status changes to "Merged" and responders are not re-assigned.
        /// </remarks>
        /// <param name="id">The pending report ID</param>
        /// <param name="dto">Contains the target disaster ID to merge into</param>
        /// <returns>The existing disaster details after merge</returns>
        // PUT /api/reports/5/merge-existing  — admin links report to an existing disaster
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/merge-existing")]
        public async Task<IActionResult> MergeExisting(int id, [FromBody] MergeIntoExistingDto dto)
        {
            try
            {
                var disaster = await _reportService.MergeIntoExistingDisasterAsync(id, dto.DisasterId);
                return Ok(new DisasterResponseDto(
                    disaster.Id, disaster.Type, disaster.Severity, disaster.Status,
                    disaster.Source, disaster.Latitude, disaster.Longitude,
                    disaster.Description, disaster.ReportedAt, disaster.VerifiedAt));
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new disaster record from a pending report.
        /// Restricted to Admin role. Use when a report describes a NEW disaster event.
        /// </summary>
        /// <remarks>
        /// Transforms a pending report into a verified disaster and automatically assigns the nearest responder organization.
        /// Broadcasts real-time alert to all connected clients via SignalR.
        /// The disaster begins in "Verified" state and immediately triggers responder assignment.
        /// </remarks>
        /// <param name="id">The pending report ID to convert</param>
        /// <param name="dto">Contains disaster details (type, severity, description)</param>
        /// <returns>The newly created disaster and auto-assigned responder</returns>
        // PUT /api/reports/5/create-disaster  — admin confirms this is a NEW disaster
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/create-disaster")]
        public async Task<IActionResult> CreateDisasterFromReport(int id, [FromBody] CreateDisasterFromReportDto dto)
        {
            try
            {
                var disaster = await _reportService.CreateDisasterFromReportAsync(id, dto);
                return Ok(new DisasterResponseDto(
                    disaster.Id, disaster.Type, disaster.Severity, disaster.Status,
                    disaster.Source, disaster.Latitude, disaster.Longitude,
                    disaster.Description, disaster.ReportedAt, disaster.VerifiedAt));
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        /// <summary>
        /// Reject a pending report with a reason.
        /// Restricted to Admin role. Use when a report is invalid, false alarm, or duplicate.
        /// </summary>
        /// <remarks>
        /// Report status changes to "Rejected". The rejector's reason is recorded for audit purposes.
        /// No responders are assigned when a report is rejected.
        /// </remarks>
        /// <param name="id">The pending report ID to reject</param>
        /// <param name="dto">Contains the rejection reason</param>
        /// <returns>The rejected report details</returns>
        // PUT /api/reports/5/reject
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/reject")]
        public async Task<IActionResult> Reject(int id, [FromBody] RejectReportDto dto)
        {
            try
            {
                var report = await _reportService.RejectReportAsync(id, dto.Reason);
                return Ok(new ReportResponseDto(
                    report.Id, report.DisasterId, report.ReportedByUserId,
                    (await _db.Users.FindAsync(report.ReportedByUserId))?.FullName ?? "",
                    report.Type, report.Description, report.Latitude, report.Longitude,
                    report.ImageUrl, report.LocationName, report.Status, report.CreatedAt));
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
    }
        // GET /api/reports/{id}/votes
        [HttpGet("{id}/votes")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVotes(int id)
        {
            var votes = await _db.ReportVerifications
                .Where(v => v.ReportId == id)
                .ToListAsync();

            return Ok(new
            {
                Yes = votes.Count(v => v.Confirmed),
                No = votes.Count(v => !v.Confirmed),
                Total = votes.Count,
            });
        }

        // POST /api/reports/{id}/verify
        [Authorize]
        [HttpPost("{id}/verify")]
        public async Task<IActionResult> VerifyReport(int id, [FromBody] VerifyReportDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            // Prevent duplicate voting
            var exists = await _db.ReportVerifications
                .AnyAsync(v => v.ReportId == id && v.UserId == userId);
            if (exists)
                return BadRequest(new { Error = "You have already voted on this report." });

            _db.ReportVerifications.Add(new ReportVerification
            {
                ReportId = id,
                UserId = userId,
                Confirmed = dto.Confirmed,
            });
            await _db.SaveChangesAsync();

            // Auto-escalate if 3+ people confirm it
            var confirmCount = await _db.ReportVerifications
                .CountAsync(v => v.ReportId == id && v.Confirmed);

            if (confirmCount >= 3)
            {
                var report = await _db.DisasterReports.FindAsync(id);
                if (report != null && report.Status == ReportStatus.Pending)
                {
                    report.Status = ReportStatus.Reviewed;
                    await _db.SaveChangesAsync();
                    // Notify admin to escalate
                }
            }

            return Ok(new { Message = "Vote recorded." });
        }

        public record VerifyReportDto(bool Confirmed);

    }
}

