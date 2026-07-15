using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StatsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;

        public StatsController(AppDbContext db, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        // GET /api/stats
        [HttpGet]
        public async Task<IActionResult> GetStats()
        {
            var totalDisasters = await _db.Disasters.CountAsync();
            var activeDisasters = await _db.Disasters.CountAsync(d => d.Status != Enums.DisasterStatus.Resolved && d.Status != Enums.DisasterStatus.FalseAlarm);
            var resolvedDisasters = await _db.Disasters.CountAsync(d => d.Status == Enums.DisasterStatus.Resolved);
            
            var totalReports = await _db.DisasterReports.CountAsync();
            var pendingReports = await _db.DisasterReports.CountAsync(r => r.Status == Enums.ReportStatus.Pending);
            var verifiedReports = await _db.DisasterReports.CountAsync(r => r.Status == Enums.ReportStatus.Reviewed);
            var rejectedReports = await _db.DisasterReports.CountAsync(r => r.Status == Enums.ReportStatus.Rejected);

            var activeResponders = await _db.Users
                .Join(_db.UserRoles, u => u.Id, ur => ur.UserId, (u, ur) => new { u, ur })
                .Join(_db.Roles, x => x.ur.RoleId, r => r.Id, (x, r) => new { x.u, r })
                .CountAsync(x => x.r.Name == "Responder" && (x.u.LockoutEnd == null || x.u.LockoutEnd < System.DateTimeOffset.UtcNow));

            var activeCitizens = await _db.Users
                .Join(_db.UserRoles, u => u.Id, ur => ur.UserId, (u, ur) => new { u, ur })
                .Join(_db.Roles, x => x.ur.RoleId, r => r.Id, (x, r) => new { x.u, r })
                .CountAsync(x => x.r.Name == "Citizen" && (x.u.LockoutEnd == null || x.u.LockoutEnd < System.DateTimeOffset.UtcNow));

            return Ok(new
            {
                TotalDisasters = totalDisasters,
                ActiveDisasters = activeDisasters,
                ResolvedDisasters = resolvedDisasters,
                TotalReports = totalReports,
                PendingReports = pendingReports,
                VerifiedReports = verifiedReports,
                RejectedReports = rejectedReports,
                ActiveResponders = activeResponders,
                ActiveCitizens = activeCitizens
            });
        }
    }
}
