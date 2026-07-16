using DisasterPreparedness_ResponseSystem.Core.DTOs;
using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Helpers;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using DisasterPreparedness_ResponseSystem.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    /// <summary>
    /// Controller that exposes disaster-related endpoints (list, get, create, verify and update status).
    /// Handles verification workflow and triggers responder assignment and alerts.
    /// </summary>
    /// <remarks>
    /// Route: api/disasters
    /// Roles: Admin and Responder for state-changing endpoints; read endpoints are public.
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class DisastersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IResponderAssignmentService _assignmentService;
        private readonly IAlertService _alertService;
        private readonly IDisasterCreationService _creation;

        public DisastersController(AppDbContext db, IResponderAssignmentService assignmentService, IAlertService alertService, IDisasterCreationService creation)
        {
            _db = db;
            _assignmentService = assignmentService;
            _alertService = alertService;
            _creation = creation;
        }

        /// <summary>
        /// Retrieve all disasters with optional filtering by status.
        /// Open to all users. Returns most recent disasters first.
        /// </summary>
        /// <remarks>
        /// Status values: Reported, Verified, ResponseInProgress, Resolved, FalseAlarm.
        /// If no status filter is provided, returns all disasters.
        /// Used for real-time dashboard displays and citizen alerts.
        /// </remarks>
        /// <param name="status">Optional: Filter disasters by status</param>
        /// <returns>List of disasters matching the filter, sorted by most recent first</returns>
        // GET /api/disasters?status=Verified
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] DisasterStatus? status)
        {
            var query = _db.Disasters.AsQueryable();
            if (status.HasValue) query = query.Where(d => d.Status == status);

            var disasters = await query
                .OrderByDescending(d => d.ReportedAt)
                .Select(d => new DisasterResponseDto(
                    d.Id, d.Type, d.Severity, d.Status, d.Source,
                    d.Latitude, d.Longitude, d.Description, d.ReportedAt, d.VerifiedAt))
                .ToListAsync();

            return Ok(disasters);
        }

        /// <summary>
        /// Retrieve a specific disaster by ID.
        /// Open to all users. Includes location, severity, type, and verification details.
        /// </summary>
        /// <param name="id">The disaster ID</param>
        /// <returns>Disaster details (location, type, severity, status, verified timestamp)</returns>
        // GET /api/disasters/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var disaster = await _db.Disasters.FindAsync(id);
            if (disaster == null) return NotFound();

            return Ok(new DisasterResponseDto(
                disaster.Id, disaster.Type, disaster.Severity, disaster.Status, disaster.Source,
                disaster.Latitude, disaster.Longitude, disaster.Description, disaster.ReportedAt, disaster.VerifiedAt));
        }

        /// <summary>
        /// Manually create a new disaster record.
        /// Restricted to Admin role. Rare—most disasters originate from citizen reports.
        /// Used when disasters are detected by external APIs (weather, earthquake) or entered directly by NDMA.
        /// </summary>
        /// <remarks>
        /// Disaster begins in "Reported" status. After creation, Admin must call /verify to trigger responder assignment.
        /// Location (latitude, longitude) must be within Pakistan range (Lat: 23–37, Lon: 60–77).
        /// </remarks>
        /// <param name="dto">Disaster details (type, severity, location, description, affected area radius)</param>
        /// <returns>The newly created disaster record</returns>
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> AdminCreate([FromBody] CreateAdminDisasterDto dto)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var disaster = await _creation.CreateAdminDisasterAsync(adminId, dto);
                return CreatedAtAction(nameof(GetById), new { id = disaster.Id },
                    new DisasterResponseDto(
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
        /// Verify a disaster and trigger automatic assignment of the nearest responder organization.
        /// Restricted to Admin role. This is a critical trigger point in the response workflow.
        /// </summary>
        /// <remarks>
        /// When a disaster is verified:
        /// 1. Status changes to "Verified"
        /// 2. Nearest responder organization is auto-assigned by distance
        /// 3. Real-time alert is broadcast via SignalR to all connected citizens and responders
        /// 4. Assignment record is created with method = "AutoAssigned"
        /// 
        /// Disaster must be in "Reported" status to be verified.
        /// </remarks>
        /// <param name="id">The disaster ID to verify</param>
        /// <returns>Verified disaster, assignment ID, assigned organization ID, and assignment method</returns>
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/verify")]
        public async Task<IActionResult> VerifyDisaster(int id)
        {
            var disaster = await _db.Disasters.FindAsync(id);
            if (disaster == null) return NotFound();

            if (disaster.Status == DisasterStatus.Verified)
                return BadRequest(new { Error = "Already verified." });

            if (disaster.Source == DisasterSource.AdminReport)
                return BadRequest(new { Error = "Admin-created disasters are auto-verified." });

            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            disaster.Status = DisasterStatus.Verified;
            disaster.VerifiedAt = DateTime.UtcNow;
            disaster.VerifiedByUserId = adminId;
            await _db.SaveChangesAsync();

            await _alertService.SendDisasterAlertAsync(disaster);
            var isAlertOnly = DisasterCategoryHelper.IsAlertOnly(disaster.Type);
            ResponderAssignment? assignment = null;
            if (!isAlertOnly)
                assignment = await _assignmentService.AutoAssignAsync(disaster.Id);

            return Ok(new
            {
                Message = isAlertOnly
                    ? "Alert disaster verified. Precaution alerts sent to citizens."
                    : "Disaster verified. Responders auto-assigned.",
                DisasterId = disaster.Id,
                AlertOnly = isAlertOnly,
                Assignment = assignment != null ? new { assignment.Id, assignment.ResponderOrganizationId } : null
            });
        }

        /// <summary>
        /// Update the status of an ongoing disaster.
        /// Restricted to Admin and Responder roles. Used to track disaster progression and resolution.
        /// </summary>
        /// <remarks>
        /// Common status transitions:
        /// Reported → Verified (by /verify endpoint)
        /// Verified → ResponseInProgress (by responder org)
        /// ResponseInProgress → Resolved (when responder completes)
        /// Any Status → FalseAlarm (if confirmed to be invalid)
        /// </remarks>
        /// <param name="id">The disaster ID to update</param>
        /// <param name="dto">New status value</param>
        /// <returns>Updated disaster details with new status</returns>
        // PUT /api/disasters/5/status  (general status updates: ResponseInProgress, Resolved, FalseAlarm)
        [Authorize(Roles = "Admin,Responder")]
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateDisasterStatusDto dto)
        {
            var disaster = await _db.Disasters.FindAsync(id);
            if (disaster == null) return NotFound();

            disaster.Status = dto.Status;
            await _db.SaveChangesAsync();
            var dtoResp = new DisasterResponseDto(disaster.Id, disaster.Type, disaster.Severity, disaster.Status, disaster.Source,
                disaster.Latitude, disaster.Longitude, disaster.Description, disaster.ReportedAt, disaster.VerifiedAt);
            return Ok(new DisasterResponseDto(
    disaster.Id, disaster.Type, disaster.Severity, disaster.Status,
    disaster.Source, disaster.Latitude, disaster.Longitude,
    disaster.Description, disaster.ReportedAt, disaster.VerifiedAt));
        }

        // GET /api/geocoding/nearby-disasters?type=Flood&latitude=31.5&longitude=74.3&radiusKm=3
        [HttpGet("/api/geocoding/nearby-disasters")]
        [AllowAnonymous]
        public async Task<IActionResult> GetNearbyDisasters(
            [FromQuery] DisasterType type,
            [FromQuery] double latitude,
            [FromQuery] double longitude,
            [FromQuery] double radiusKm = 3)
        {
            var active = await _db.Disasters
                .Where(d => d.Type == type &&
                            !new[] { DisasterStatus.Resolved, DisasterStatus.FalseAlarm,
                             DisasterStatus.Closed, DisasterStatus.AlertExpired }
                                .Contains(d.Status))
                .ToListAsync();

            var nearby = active.FirstOrDefault(d =>
                DistanceCalculator.CalculateKm(latitude, longitude, d.Latitude, d.Longitude) <= radiusKm);

            return Ok(new
            {
                Disaster = nearby != null ? new DisasterResponseDto(
                nearby.Id, nearby.Type, nearby.Severity, nearby.Status, nearby.Source,
                nearby.Latitude, nearby.Longitude, nearby.Description,
                nearby.ReportedAt, nearby.VerifiedAt) : null
            });
        }

        /// <summary>
        /// Permanently deletes a disaster record. Restricted to Admin.
        /// Any citizen reports linked to it are unlinked (kept) instead of deleted.
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDisaster(int id)
        {
            var disaster = await _db.Disasters.FindAsync(id);
            if (disaster == null) return NotFound();

            // Unlink reports first so deleting the disaster doesn't fail
            var linkedReports = await _db.DisasterReports
                .Where(r => r.DisasterId == id)
                .ToListAsync();
            foreach (var r in linkedReports) r.DisasterId = null;

            _db.Disasters.Remove(disaster);
            await _db.SaveChangesAsync();

            return Ok(new { Message = "Disaster deleted successfully." });
        }

        /// <summary>
        /// Returns contact details of the citizen who first reported this disaster (if any).
        /// </summary>
        [Authorize(Roles = "Admin,Responder")]
        [HttpGet("{id}/reporter")]
        public async Task<IActionResult> GetReporterContact(int id)
        {
            var report = await _db.DisasterReports
                .Include(r => r.ReportedByUser)
                .Where(r => r.DisasterId == id)
                .OrderBy(r => r.CreatedAt)
                .FirstOrDefaultAsync();

            if (report == null)
                return NotFound(new { Error = "No citizen report is linked to this disaster." });

            return Ok(new
            {
                report.ReportedByUser.FullName,
                report.ReportedByUser.Email,
                Phone = report.ReportedByUser.PhoneNumber
            });
        }
    }
}
