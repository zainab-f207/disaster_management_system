using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PushController : ControllerBase
    {
        private readonly IPushNotificationService _push;
        private readonly IConfiguration _config;

        public PushController(IPushNotificationService push, IConfiguration config)
        {
            _push = push;
            _config = config;
        }

        // Frontend calls this to get the VAPID public key
        [HttpGet("vapid-public-key")]
        [AllowAnonymous]
        public IActionResult GetPublicKey()
            => Ok(new { publicKey = _config["VapidKeys:PublicKey"] });

        // Frontend calls this to save its push subscription
        [HttpPost("subscribe")]
        public async Task<IActionResult> Subscribe([FromBody] SubscribeDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            await _push.SaveSubscriptionAsync(userId, dto.Endpoint, dto.P256dh, dto.Auth);
            return Ok(new { message = "Subscribed to push notifications." });
        }

        [HttpDelete("unsubscribe")]
        public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeDto dto)
        {
            await _push.RemoveSubscriptionAsync(dto.Endpoint);
            return Ok();
        }
    }

    public record SubscribeDto(string Endpoint, string P256dh, string Auth);
    public record UnsubscribeDto(string Endpoint);
}
