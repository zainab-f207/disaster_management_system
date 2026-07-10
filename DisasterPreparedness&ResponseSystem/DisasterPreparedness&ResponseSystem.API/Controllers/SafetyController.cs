using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SafetyController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IAlertService _alert;

        public SafetyController(AppDbContext db, IAlertService alert)
        {
            _db = db;
            _alert = alert;
        }

        [HttpPost("mark-safe")]
        public async Task<IActionResult> MarkSafe([FromBody] MarkSafeDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            // Prevent duplicate
            var exists = await _db.SafetyChecks
                .AnyAsync(s => s.DisasterId == dto.DisasterId && s.UserId == userId);
            if (exists)
                return Ok(new { Message = "Already marked safe for this disaster." });

            var check = new SafetyCheck
            {
                DisasterId = dto.DisasterId,
                UserId = userId,
            };
            _db.SafetyChecks.Add(check);
            await _db.SaveChangesAsync();

            var user = await _db.Users.FindAsync(userId);

            // Notify admins + family (anyone who cares)
            await _alert.SendSystemAlertAsync(
                $"✅ {user?.FullName} has marked themselves SAFE during Disaster #{dto.DisasterId}",
                dto.DisasterId);

            return Ok(new { Message = "Marked as safe successfully." });
        }

        [HttpGet("check/{disasterId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSafetyStatus(int disasterId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var checks = await _db.SafetyChecks
                .Include(s => s.User)
                .Where(s => s.DisasterId == disasterId)
                .ToListAsync();

            return Ok(new
            {
                DisasterId = disasterId,
                Count = checks.Count,
                MarkedSafe = userId != null && checks.Any(c => c.UserId == userId),
                Users = checks.Select(c => c.User.FullName).Take(10).ToList(),
            });
        }
    }

    public record MarkSafeDto(int DisasterId);
}
