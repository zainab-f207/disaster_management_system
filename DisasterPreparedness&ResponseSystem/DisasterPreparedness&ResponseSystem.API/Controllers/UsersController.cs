using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly AppDbContext _db;

        public UsersController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            AppDbContext db)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _db = db;
        }

        // GET /api/users?role=Citizen&search=xyz
        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? role, [FromQuery] string? search)
        {
            var query = _db.Users.AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                var lowerSearch = search.ToLower();
                query = query.Where(u => u.FullName.ToLower().Contains(lowerSearch) || u.Email!.ToLower().Contains(lowerSearch));
            }

            // Project users to simple list
            var allUsers = await query
                .Include(u => u.ResponderOrganization)
                .ToListAsync();

            var userIds = allUsers.Select(u => u.Id).ToList();

            // Fetch report counts in bulk
            var reportStats = await _db.DisasterReports
                .Where(r => r.ReportedByUserId != null && userIds.Contains(r.ReportedByUserId))
                .GroupBy(r => r.ReportedByUserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    TotalCount = g.Count(),
                    VerifiedCount = g.Count(r => r.Status == Enums.ReportStatus.Reviewed)
                })
                .ToDictionaryAsync(x => x.UserId, x => x);

            var resolvedDtos = new List<object>();

            foreach (var u in allUsers)
            {
                var roles = await _userManager.GetRolesAsync(u);
                var userRole = roles.FirstOrDefault() ?? "Citizen";

                // Filter by role if requested
                if (!string.IsNullOrEmpty(role) && !userRole.Equals(role, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                // Retrieve pre-calculated stats
                var totalReports = 0;
                var verifiedReports = 0;
                if (reportStats.TryGetValue(u.Id, out var stats))
                {
                    totalReports = stats.TotalCount;
                    verifiedReports = stats.VerifiedCount;
                }

                // Calculate trust score based on report verification history
                var trustScore = totalReports > 0 ? (int)Math.Round((double)verifiedReports / totalReports * 100) : 100;

                // Determine active status from lockout properties
                var isActive = u.LockoutEnd == null || u.LockoutEnd < DateTimeOffset.UtcNow;

                resolvedDtos.Add(new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    Role = userRole,
                    u.ResponderOrganizationId,
                    OrganizationName = u.ResponderOrganization?.Name,
                    IsActive = isActive,
                    IsPending = !u.EmailConfirmed,
                    TrustScore = trustScore,
                    ReportCount = totalReports
                });
            }

            return Ok(resolvedDtos);
        }

        // GET /api/users/responders (Convenience endpoint for admin)
        [HttpGet("responders")]
        public async Task<IActionResult> GetResponders()
        {
            return await GetUsers("Responder", null);
        }

        // GET /api/users/citizens (Convenience endpoint for admin)
        [HttpGet("citizens")]
        public async Task<IActionResult> GetCitizens()
        {
            return await GetUsers("Citizen", null);
        }

        // PATCH /api/users/{id} (Toggle suspension or update active status)
        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateUserStatusDto dto)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            if (dto.IsActive)
            {
                // Unsuspend/activate the user
                user.LockoutEnd = null;
            }
            else
            {
                // Suspend the user indefinitely/long time
                user.LockoutEnd = DateTimeOffset.MaxValue;
            }

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
                return BadRequest(result.Errors.Select(e => e.Description));

            return Ok(new { Message = "User status updated successfully", IsActive = dto.IsActive });
        }

        // DELETE /api/users/{id} — Admin permanently deletes a citizen or responder account
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound(new { Message = "User not found." });

            // Prevent admins from being deleted via this endpoint
            var roles = await _userManager.GetRolesAsync(user);
            if (roles.Contains("Admin"))
                return Forbid();

            // Remove associated family connections
            var familyLinks = _db.FamilyConnections.Where(f => f.OwnerUserId == id || f.MemberUserId == id);
            _db.FamilyConnections.RemoveRange(familyLinks);

            // Orphan the user's disaster reports (keep the reports, just clear the reporter link)
            var reports = await _db.DisasterReports.Where(r => r.ReportedByUserId == id).ToListAsync();
            foreach (var r in reports) r.ReportedByUserId = null;

            await _db.SaveChangesAsync();

            var deleteResult = await _userManager.DeleteAsync(user);
            if (!deleteResult.Succeeded)
                return BadRequest(deleteResult.Errors.Select(e => e.Description));

            return Ok(new { Message = "Account deleted successfully." });
        }

        /// <summary>
        /// Lets the currently logged-in responder set their own availability.
        /// </summary>
        [Authorize(Roles = "Responder")]
        [HttpPut("me/availability")]
        public async Task<IActionResult> UpdateMyAvailability([FromBody] UpdateAvailabilityDto dto)
        {
            if (!new[] { "Online", "Offline", "Busy" }.Contains(dto.Status))
                return BadRequest(new { Error = "Status must be Online, Offline, or Busy." });

            var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId!);
            if (user == null) return NotFound();

            user.AvailabilityStatus = dto.Status;
            await _userManager.UpdateAsync(user);

            return Ok(new { user.AvailabilityStatus });
        }

        /// <summary>
        /// Returns the currently logged-in responder's own availability.
        /// </summary>
        [Authorize(Roles = "Responder")]
        [HttpGet("me/availability")]
        public async Task<IActionResult> GetMyAvailability()
        {
            var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId!);
            if (user == null) return NotFound();
            return Ok(new { user.AvailabilityStatus });
        }
    }

    public class UpdateUserStatusDto
    {
        public bool IsActive { get; set; }
    }

        public record UpdateAvailabilityDto(string Status);
}
