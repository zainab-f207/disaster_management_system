using DisasterPreparedness_ResponseSystem.Core.Entity;
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
    public class PreparednessAdvisoryService : IPreparednessAdvisoryService
    {
        private readonly AppDbContext _db;
        public PreparednessAdvisoryService(AppDbContext db) => _db = db;

        public async Task<PreparednessAdvisory?> CreateIfNewAsync(
            string city, double lat, double lon,
            DisasterType type, SeverityLevel severity,
            DateTime forecastFor, string message)
        {
            var exists = await _db.PreparednessAdvisories.AnyAsync(a =>
                a.City == city && a.Type == type &&
                a.ForecastFor.Date == forecastFor.Date);

            if (exists) return null;

            var advisory = new PreparednessAdvisory
            {
                City = city,
                Latitude = lat,
                Longitude = lon,
                Type = type,
                Severity = severity,
                ForecastFor = forecastFor,
                Message = message
            };

            _db.PreparednessAdvisories.Add(advisory);
            await _db.SaveChangesAsync();
            return advisory;
        }

        public async Task<PreparednessAdvisory> AcknowledgeAsync(int id, string userId)
        {
            var advisory = await _db.PreparednessAdvisories.FindAsync(id)
                ?? throw new Exception("Advisory not found");

            advisory.Acknowledged = true;
            advisory.AcknowledgedByUserId = userId;
            await _db.SaveChangesAsync();
            return advisory;
        }
    }
}
