using DisasterPreparedness_ResponseSystem.Core.DTOs;
using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ITokenService _tokenService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _config;
        private readonly AppDbContext _db;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            ITokenService tokenService,
            IEmailService emailService,
            IConfiguration config,
            AppDbContext appDbContext)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _tokenService = tokenService;
            _emailService = emailService;
            _config = config;
            _db=appDbContext;
        }

        // POST /api/auth/register — Citizens only. Responders are invited by Admin.
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (dto.Role != "Citizen")
                return BadRequest(new { Error = "Self-registration is only available for Citizens. Responders are invited by an Admin." });

            var existing = await _userManager.FindByEmailAsync(dto.Email);

            ApplicationUser user;

            if (existing != null && existing.FullName == "Pending Invite" && !existing.EmailConfirmed)
            {
                user = existing;
                user.FullName = dto.FullName;
                user.PhoneNumber = dto.PhoneNumber;
                user.EmailConfirmed = false; 

                var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                var resetResult = await _userManager.ResetPasswordAsync(user, resetToken, dto.Password);
                if (!resetResult.Succeeded) return BadRequest(resetResult.Errors.Select(e => e.Description));

                await _userManager.UpdateAsync(user);
            }
            else if (existing != null)
            {
                return BadRequest(new { Error = "A user with this email already exists." });
            }
            else
            {
                user = new ApplicationUser
                {
                    FullName = dto.FullName,
                    Email = dto.Email,
                    UserName = dto.Email,
                    PhoneNumber = dto.PhoneNumber,
                    EmailConfirmed = false, 
                };

                var result = await _userManager.CreateAsync(user, dto.Password);
                if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));
            }

            if (!await _userManager.IsInRoleAsync(user, "Citizen"))
                await _userManager.AddToRoleAsync(user, "Citizen");

            if (!string.IsNullOrEmpty(dto.InviterId) && dto.InviterId != user.Id)
            {
                var exists = await _db.FamilyConnections.AnyAsync(f =>
                    (f.OwnerUserId == dto.InviterId && f.MemberUserId == user.Id) ||
                    (f.OwnerUserId == user.Id && f.MemberUserId == dto.InviterId));

                if (!exists)
                {
                    _db.FamilyConnections.Add(new FamilyConnection
                    {
                        OwnerUserId = dto.InviterId,
                        MemberUserId = user.Id,
                        Status = "Accepted" 
                    });
                    await _db.SaveChangesAsync();
                }
            }

            await SendVerificationEmailAsync(user);

            return Ok(new { Message = "Registration successful! Please check your email to verify your account before logging in." });
        }

        // POST /api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null) return Unauthorized(new { Error = "Invalid email or password." });

            var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);

            if (result.IsLockedOut)
                return Unauthorized(new { Error = "Too many failed attempts. Please try again in a few minutes." });

            if (!result.Succeeded)
                return Unauthorized(new { Error = "Invalid email or password." });

            if (!user.EmailConfirmed)
                return Unauthorized(new { Error = "Please verify your email before logging in. Check your inbox for the verification link." });

            var token = await _tokenService.GenerateTokenAsync(user);
            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new AuthResponseDto(
                Token: token,
                UserId: user.Id,
                FullName: user.FullName,
                Email: user.Email!,
                Role: roles.FirstOrDefault() ?? "Citizen",
                OrganizationId: user.ResponderOrganizationId,
                ExpiresAt: DateTime.UtcNow.AddHours(24)
            ));
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var user = await _userManager.FindByIdAsync(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            if (user == null) return NotFound();

            var roles = await _userManager.GetRolesAsync(user);
            return Ok(new AuthResponseDto(
                Token: "", UserId: user.Id, FullName: user.FullName, Email: user.Email!,
                Role: roles.FirstOrDefault() ?? "", OrganizationId: user.ResponderOrganizationId,
                ExpiresAt: DateTime.UtcNow
            ));
        }

        // POST /api/auth/confirm-email
        [HttpPost("confirm-email")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null) return BadRequest(new { Error = "Invalid confirmation link." });
            if (user.EmailConfirmed) return Ok(new { Message = "Your email is already verified. You can log in." });

            var result = await _userManager.ConfirmEmailAsync(user, dto.Token);
            if (!result.Succeeded)
                return BadRequest(new { Error = "This confirmation link is invalid or has expired." });

            return Ok(new { Message = "Email verified successfully! You can now log in." });
        }

        // POST /api/auth/resend-verification
        [HttpPost("resend-verification")]
        [AllowAnonymous]
        public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null) return Ok(new { Message = "If an account with that email exists, a verification link has been sent." });
            if (user.EmailConfirmed) return BadRequest(new { Error = "This email is already verified. Please log in." });

            await SendVerificationEmailAsync(user);
            return Ok(new { Message = "Verification email sent." });
        }

        private async Task SendVerificationEmailAsync(ApplicationUser user)
        {
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var frontendUrl = _config["FrontendUrl"] ?? "http://localhost:5173";
            var link = $"{frontendUrl}/verify-email?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";

            var subject = "Verify your email — Pakistan Disaster Response System";
            var body = $@"
                <h2>Welcome, {user.FullName}!</h2>
                <p>Please confirm your email address to activate your account:</p>
                <p><a href='{link}'>{link}</a></p>
                <p>If you didn't create this account, you can ignore this email.</p>
            ";
            await _emailService.SendEmailAsync(user.Email!, subject, body);
        }
    }
}