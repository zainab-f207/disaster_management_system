using DisasterPreparedness_ResponseSystem.Core.DTOs;
using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Hubs;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Responder")]
        public class ChatController : ControllerBase
        {
            private readonly AppDbContext _db;
            private readonly UserManager<ApplicationUser> _userManager;
            private readonly IHubContext<DisasterHub, IDisasterHubClient> _hub;

            public ChatController(AppDbContext db, UserManager<ApplicationUser> userManager,
                IHubContext<DisasterHub, IDisasterHubClient> hub)
            {
                _db = db;
                _userManager = userManager;
                _hub = hub;
            }

            [HttpGet("{organizationId}/messages")]
            public async Task<IActionResult> GetMessages(int organizationId)
            {
                var messages = await _db.ChatMessages
                    .Where(m => m.OrganizationId == organizationId)
                    .OrderByDescending(m => m.SentAt)
                    .Take(100)
                    .OrderBy(m => m.SentAt) 
                    .Select(m => new ChatMessageDto(
                        m.Id, m.OrganizationId, m.SenderId, m.SenderName, m.SenderRole, m.Message, m.SentAt))
                    .ToListAsync();

                return Ok(messages);
            }

            [HttpPost("{organizationId}/messages")]
            public async Task<IActionResult> SendMessage(int organizationId, [FromBody] SendChatMessageDto dto)
            {
                if (string.IsNullOrWhiteSpace(dto.Message))
                    return BadRequest(new { Error = "Message cannot be empty." });

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null) return Unauthorized();

                var roles = await _userManager.GetRolesAsync(user);
                var role = roles.FirstOrDefault() ?? "Responder";

                if (role == "Responder" && user.ResponderOrganizationId != organizationId)
                    return Forbid();

                var message = new ChatMessage
                {
                    OrganizationId = organizationId,
                    SenderId = userId,
                    SenderName = user.FullName,
                    SenderRole = role,
                    Message = dto.Message.Trim(),
                    SentAt = DateTime.UtcNow,
                };

                _db.ChatMessages.Add(message);
                await _db.SaveChangesAsync();

                var messageDto = new ChatMessageDto(
                    message.Id, message.OrganizationId, message.SenderId,
                    message.SenderName, message.SenderRole, message.Message, message.SentAt);

                await _hub.Clients.Group($"OrgChat_{organizationId}").ReceiveChatMessage(messageDto);
                await _hub.Clients.Group("Admins").ReceiveChatMessage(messageDto);

                return Ok(messageDto);
            }
        }
    }

