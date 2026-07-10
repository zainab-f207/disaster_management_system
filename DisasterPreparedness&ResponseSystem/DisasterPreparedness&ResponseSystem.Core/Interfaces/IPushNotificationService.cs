using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Interfaces
{
    public interface IPushNotificationService
    {
        Task SendToUserAsync(string userId, string title, string body, string? url = null);
        Task SendToRoleAsync(string role, string title, string body, string? url = null);
        Task SaveSubscriptionAsync(string userId, string endpoint, string p256dh, string auth);
        Task RemoveSubscriptionAsync(string endpoint);
    }
}
