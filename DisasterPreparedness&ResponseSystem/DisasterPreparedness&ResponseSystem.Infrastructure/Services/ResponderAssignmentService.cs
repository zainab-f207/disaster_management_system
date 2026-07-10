using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Helpers;
using DisasterPreparedness_ResponseSystem.Core.Rules;
using DisasterPreparedness_ResponseSystem.Infrastructure.BackgroundServices;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using DisasterPreparedness_ResponseSystem.Infrastructure.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class ResponderAssignmentService : IResponderAssignmentService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<DisasterMonitoringService> _logger;



        public ResponderAssignmentService(AppDbContext db, ILogger<DisasterMonitoringService> logger)
        {
            _db = db;
            _logger = logger;

        }

        public async Task<ResponderAssignment> AutoAssignAsync(int disasterId)
        {
            var disaster = await _db.Disasters.FindAsync(disasterId)
        ?? throw new Exception("Disaster not found");

            if (DisasterCategoryHelper.IsAlertOnly(disaster.Type))
            {
                _logger.LogInformation(
                    "Disaster #{Id} ({Type}) is alert-only — no responder assigned.",
                    disasterId, disaster.Type);
                return null; 
            }

            var preferredTypes = DisasterOrgMapping.PreferredOrgs[disaster.Type];

            var candidates = await _db.ResponderOrganizations
                .Where(o => o.IsActive && preferredTypes.Contains(o.Type))
                .ToListAsync();

            var nearest = candidates
                .OrderBy(o => Array.IndexOf(preferredTypes, o.Type))      
                .ThenBy(o => DistanceCalculator.CalculateKm(
                    disaster.Latitude, disaster.Longitude, o.BaseLatitude, o.BaseLongitude))
                .FirstOrDefault();

            if (nearest == null)
                throw new Exception("No active responder organization found for this disaster type");

            var assignment = new ResponderAssignment
            {
                DisasterId = disasterId,
                ResponderOrganizationId = nearest.Id,
                Status = AssignmentStatus.Assigned,
                Method = AssignmentMethod.Auto
            };

            _db.ResponderAssignments.Add(assignment);
            await _db.SaveChangesAsync();
            return assignment;
        }

        public async Task<ResponderAssignment> OverrideAssignmentAsync(int assignmentId, int newOrgId, string adminUserId)
        {
            var assignment = await _db.ResponderAssignments.FindAsync(assignmentId)
                ?? throw new Exception("Assignment not found");

            assignment.ResponderOrganizationId = newOrgId;
            assignment.Method = AssignmentMethod.ManualOverride;
            assignment.Status = AssignmentStatus.Assigned;
            assignment.AssignedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return assignment;
        }
    }
}
