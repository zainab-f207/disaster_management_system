using DisasterPreparedness_ResponseSystem.Core.Helpers;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class DuplicateCheckService : IDuplicateCheckService
    {
        private readonly AppDbContext _db;

        public DuplicateCheckService(AppDbContext db) => _db = db;

        public async Task<bool> ActiveDisasterExistsAsync(
            DisasterType type, double lat, double lon, double radiusKm = 50)
        {
            
            var activeDisasters = await _db.Disasters
                .Where(d => d.Type == type &&
                            d.Status != DisasterStatus.Resolved &&
                            d.Status != DisasterStatus.FalseAlarm)
                .ToListAsync();

            
            return activeDisasters.Any(d =>
                DistanceCalculator.CalculateKm(lat, lon, d.Latitude, d.Longitude) <= radiusKm);
        }
    }
}
