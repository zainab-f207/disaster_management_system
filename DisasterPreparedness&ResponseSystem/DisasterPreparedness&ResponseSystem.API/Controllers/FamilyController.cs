using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FamilyController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailService _emailService;

        public FamilyController(AppDbContext db, UserManager<ApplicationUser> userManager, IEmailService emailService)
        {
            _db = db; _userManager = userManager; _emailService = emailService;
        }

        // POST /api/family/invite  { "email": "sister@example.com" }
        [HttpPost("invite")]
        public async Task<IActionResult> Invite([FromBody] InviteFamilyDto dto)
        {
            var myId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var target = await _userManager.FindByEmailAsync(dto.Email);
            
            if (target == null)
            {
                // Create a "shell" user to hold the connection
                target = new ApplicationUser 
                { 
                    UserName = dto.Email, 
                    Email = dto.Email, 
                    FullName = "Pending Invite",
                    EmailConfirmed = false
                };
                var pwd = Guid.NewGuid().ToString("N") + "A1!";
                var shellResult = await _userManager.CreateAsync(target, pwd);
                if (!shellResult.Succeeded) return BadRequest(new { Error = "Failed to prepare invitation." });

                // Create the pending connection
                var shellConn = new FamilyConnection { OwnerUserId = myId, MemberUserId = target.Id, Status = "Pending" };
                _db.FamilyConnections.Add(shellConn);
                await _db.SaveChangesAsync();

                // Send email invitation
                var inviteLink = $"http://localhost:5173/register?email={Uri.EscapeDataString(dto.Email)}";
                var myUser = await _userManager.FindByIdAsync(myId);
                var subject = $"{myUser?.FullName ?? "A family member"} wants to connect with you on Pakistan DRS";
                var message = $@"
                    <h2>Family Safety Network Invitation</h2>
                    <p>{myUser?.FullName ?? "A family member"} has invited you to join their Family Safety Network.</p>
                    <p>Click the link below to register and accept the invitation:</p>
                    <p><a href='{inviteLink}'>{inviteLink}</a></p>
                ";
                await _emailService.SendEmailAsync(dto.Email, subject, message);
                return Ok(new { Message = "Invitation email sent to new user." });
            }

            if (target.Id == myId) return BadRequest(new { Error = "You can't add yourself." });

            var exists = await _db.FamilyConnections.AnyAsync(f =>
                (f.OwnerUserId == myId && f.MemberUserId == target.Id) ||
                (f.OwnerUserId == target.Id && f.MemberUserId == myId));
            if (exists) return BadRequest(new { Error = "A connection already exists with this person." });

            var conn = new FamilyConnection { OwnerUserId = myId, MemberUserId = target.Id, Status = "Pending" };
            _db.FamilyConnections.Add(conn);
            await _db.SaveChangesAsync();

            // Also send an email to the existing user
            var existingUserSubject = "New Family Connection Request";
            var existingUserMessage = $@"
                <h2>Family Safety Network Request</h2>
                <p>You have a new family connection request. Log in to your Pakistan DRS dashboard to accept it.</p>
            ";
            await _emailService.SendEmailAsync(dto.Email, existingUserSubject, existingUserMessage);

            return Ok(new { Message = "Invitation sent." });
        }

        // PUT /api/family/{id}/accept
        [HttpPut("{id}/accept")]
        public async Task<IActionResult> Accept(int id)
        {
            var myId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var conn = await _db.FamilyConnections.FindAsync(id);
            if (conn == null || conn.MemberUserId != myId) return NotFound();
            conn.Status = "Accepted";
            await _db.SaveChangesAsync();
            return Ok(new { Message = "Connection accepted." });
        }

        // DELETE /api/family/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Remove(int id)
        {
            var myId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var conn = await _db.FamilyConnections.FindAsync(id);
            if (conn == null || (conn.OwnerUserId != myId && conn.MemberUserId != myId)) return NotFound();
            _db.FamilyConnections.Remove(conn);
            await _db.SaveChangesAsync();
            return Ok(new { Message = "Removed." });
        }

        // GET /api/family  — everyone connected to me, with their latest safety status
        [HttpGet]
        public async Task<IActionResult> GetMyFamily()
        {
            var myId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            var connections = await _db.FamilyConnections
                .Include(f => f.OwnerUser).Include(f => f.MemberUser)
                .Where(f => f.OwnerUserId == myId || f.MemberUserId == myId)
                .ToListAsync();

            var result = new List<object>();
            foreach (var c in connections)
            {
                var isOwner = c.OwnerUserId == myId;
                var other = isOwner ? c.MemberUser : c.OwnerUser;

                var lastCheck = await _db.SafetyChecks
                    .Include(s => s.Disaster)
                    .Where(s => s.UserId == other.Id)
                    .OrderByDescending(s => s.MarkedAt)
                    .FirstOrDefaultAsync();

                result.Add(new
                {
                    ConnectionId = c.Id,
                    c.Status,
                    IsIncomingRequest = !isOwner && c.Status == "Pending",
                    Person = new { other.Id, other.FullName, other.Email },
                    SafetyStatus = lastCheck != null ? new
                    {
                        lastCheck.MarkedAt,
                        DisasterType = lastCheck.Disaster.Type.ToString(),
                        DisasterId = lastCheck.DisasterId
                    } : null
                });
            }
            return Ok(result);
        }
    }

    public record InviteFamilyDto(string Email);
}
    

