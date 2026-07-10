using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;

namespace DisasterPreparedness_ResponseSystem.Hubs
{
    [Authorize]
    public class DisasterHub : Hub<IDisasterHubClient>
    {
        private readonly ILogger<DisasterHub> _logger;

        public DisasterHub(ILogger<DisasterHub> logger)
        {
            _logger = logger;
        }
        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            var userName = Context.User?.Identity?.Name ?? "Unknown";
            var isAdmin = Context.User?.IsInRole("Admin") == true;

            _logger.LogInformation("Client connected: {UserId} ({Name})", userId, userName);

            if (isAdmin)
                await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");

            if (Context.User?.IsInRole("Responder") == true)
                await Groups.AddToGroupAsync(Context.ConnectionId, "Responders");

            if (!isAdmin)
                await Groups.AddToGroupAsync(Context.ConnectionId, "PublicFeed");

            await Clients.Caller.ReceiveSystemMessage(
                $"Connected to Pakistan Disaster Response System. Stay alert.");

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            _logger.LogInformation("Client disconnected: {UserId}", Context.UserIdentifier);
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SubscribeToCity(string cityName)
        {
            var groupName = $"City_{cityName.Replace(" ", "_")}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            await Clients.Caller.ReceiveSystemMessage($"Subscribed to alerts for {cityName}");
            _logger.LogInformation("User {UserId} subscribed to {City}", Context.UserIdentifier, cityName);
        }

        public async Task UnsubscribeFromCity(string cityName)
        {
            var groupName = $"City_{cityName.Replace(" ", "_")}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            await Clients.Caller.ReceiveSystemMessage($"Unsubscribed from alerts for {cityName}");
        }
    }
}
