using DisasterPreparedness_ResponseSystem.Core.DTOs;
using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ResponderInvitesController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailService _emailService;
        private readonly AppDbContext _db;

        public ResponderInvitesController(UserManager<ApplicationUser> userManager, IEmailService emailService, AppDbContext db)
        {
            _userManager = userManager;
            _emailService = emailService;
            _db = db;
        }

        /// <summary>Admin adds a new responder — account is created as "pending" and an invite email is sent.</summary>
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> InviteResponder([FromBody] InviteResponderDto dto)
        {
            var existing = await _userManager.FindByEmailAsync(dto.Email);
            if (existing != null) return BadRequest(new { Error = "A user with this email already exists." });

            var org = await _db.ResponderOrganizations.FindAsync(dto.ResponderOrganizationId);
            if (org == null) return BadRequest(new { Error = "Selected organization not found." });

            var user = new ApplicationUser
            {
                FullName = dto.FullName,
                Email = dto.Email,
                UserName = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                EmailConfirmed = false, // pending until they accept the invite
                ResponderOrganizationId = dto.ResponderOrganizationId,
            };

            // Identity requires *some* password on creation. The responder
            // never sees or uses this — they set their real one via ResetPasswordAsync below.
            var placeholderPassword = Guid.NewGuid().ToString("N") + "Aa1!";
            var result = await _userManager.CreateAsync(user, placeholderPassword);
            if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));

            await _userManager.AddToRoleAsync(user, "Responder");
            await SendInviteEmailAsync(user, org.Name);

            return Ok(new { Message = "Invitation sent successfully." });
        }

        /// <summary>Responder clicks their emailed link and sets their real password here.</summary>
        [AllowAnonymous]
        [HttpPost("accept")]
        public async Task<IActionResult> AcceptInvite([FromBody] AcceptInviteDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null) return BadRequest(new { Error = "Invalid invitation link." });
            if (user.EmailConfirmed) return BadRequest(new { Error = "This account is already active. Please log in instead." });

            var result = await _userManager.ResetPasswordAsync(user, dto.Token, dto.Password);
            if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));

            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);

            return Ok(new { Message = "Account activated! You can now log in." });
        }

        /// <summary>Admin can resend the invite email if the responder lost it or it expired.</summary>
        [Authorize(Roles = "Admin")]
        [HttpPost("{userId}/resend")]
        public async Task<IActionResult> ResendInvite(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();
            if (user.EmailConfirmed) return BadRequest(new { Error = "This account is already active." });

            var org = await _db.ResponderOrganizations.FindAsync(user.ResponderOrganizationId);
            await SendInviteEmailAsync(user, org?.Name ?? "your organization");

            return Ok(new { Message = "Invitation resent." });
        }

        private async Task SendInviteEmailAsync(ApplicationUser user, string orgName)
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var link = $"http://localhost:5173/accept-invite?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";

            var subject = "You're invited to join Pakistan Disaster Response System";
            var body = $@"
                <h2>Welcome to {orgName}</h2>
                <p>Hi {user.FullName},</p>
                <p>You've been added as a Responder for <strong>{orgName}</strong> on the Pakistan Disaster Response System.</p>
                <p>Click below to set your password and activate your account:</p>
                <p><a href='{link}'>{link}</a></p>
                <p>This link can only be used once.</p>
            ";
            await _emailService.SendEmailAsync(user.Email!, subject, body);
        }
    }
}

