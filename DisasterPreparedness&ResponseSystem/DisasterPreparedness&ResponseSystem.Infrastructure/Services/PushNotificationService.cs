using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WebPush;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class PushNotificationService : IPushNotificationService
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<PushNotificationService> _logger;

        public PushNotificationService(AppDbContext db, IConfiguration config, ILogger<PushNotificationService> logger)
        {
            _db = db;
            _config = config;
            _logger = logger;
        }

        public async Task SendToUserAsync(string userId, string title, string body, string? url = null)
        {
            var subs = await _db.PushSubscriptions
                .Where(s => s.UserId == userId)
                .ToListAsync();
            await SendToSubscriptions(subs, title, body, url);
        }

        public async Task SendToRoleAsync(string role, string title, string body, string? url = null)
        {
            var userIds = await _db.UserRoles
                .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, r.Name })
                .Where(x => x.Name == role)
                .Select(x => x.UserId)
                .ToListAsync();

            var subs = await _db.PushSubscriptions
                .Where(s => userIds.Contains(s.UserId))
                .ToListAsync();

            await SendToSubscriptions(subs, title, body, url);
        }

        private async Task SendToSubscriptions(
            List<DisasterPreparedness_ResponseSystem.Core.Entity.PushSubscription> subscriptions, string title, string body, string? url)
        {
            var vapidPublic = _config["VapidKeys:PublicKey"];
            var vapidPrivate = _config["VapidKeys:PrivateKey"];
            var subject = _config["VapidKeys:Subject"];

            // If VAPID keys are not configured, skip push notifications gracefully
            if (string.IsNullOrWhiteSpace(vapidPublic) ||
                string.IsNullOrWhiteSpace(vapidPrivate) ||
                string.IsNullOrWhiteSpace(subject))
            {
                _logger.LogWarning("VAPID keys not configured — skipping push notifications.");
                return;
            }

            var webPushClient = new WebPushClient();
            webPushClient.SetVapidDetails(subject, vapidPublic, vapidPrivate);

            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                title,
                body,
                url = url ?? "/",
                icon = "/icon-192.png",
            });

            var toRemove = new List<int>();

            foreach (var sub in subscriptions)
            {
                try
                {
                    var pushSub = new WebPush.PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                    await webPushClient.SendNotificationAsync(pushSub, payload);
                }
                catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone)
                {
                    toRemove.Add(sub.Id);
                }
                catch { /* ignore other errors */ }
            }

            if (toRemove.Any())
            {
                var expired = _db.PushSubscriptions.Where(s => toRemove.Contains(s.Id));
                _db.PushSubscriptions.RemoveRange(expired);
                await _db.SaveChangesAsync();
            }
        }

        public async Task SaveSubscriptionAsync(string userId, string endpoint, string p256dh, string auth)
        {
            var existing = await _db.PushSubscriptions.FirstOrDefaultAsync(s => s.Endpoint == endpoint);
            if (existing != null)
            {
                existing.UserId = userId;
                existing.P256dh = p256dh;
                existing.Auth = auth;
            }
            else
            {
                _db.PushSubscriptions.Add(new DisasterPreparedness_ResponseSystem.Core.Entity.PushSubscription
                {
                    UserId = userId,
                    Endpoint = endpoint,
                    P256dh = p256dh,
                    Auth = auth,
                });
            }
            await _db.SaveChangesAsync();
        }

        public async Task RemoveSubscriptionAsync(string endpoint)
        {
            var sub = await _db.PushSubscriptions.FirstOrDefaultAsync(s => s.Endpoint == endpoint);
            if (sub != null) { _db.PushSubscriptions.Remove(sub); await _db.SaveChangesAsync(); }
        }
    }
}
