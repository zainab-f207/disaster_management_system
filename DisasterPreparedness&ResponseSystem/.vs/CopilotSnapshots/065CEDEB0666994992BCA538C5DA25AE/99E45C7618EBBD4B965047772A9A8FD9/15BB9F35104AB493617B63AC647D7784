using DisasterPreparedness_ResponseSystem.Core.DTOs;
using DisasterPreparedness_ResponseSystem.Core.Entity;
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
    public class ReportService : IReportService
    {
        private readonly AppDbContext _db;

        public ReportService(AppDbContext db) => _db = db;

        public async Task<DisasterReport> CreateReportAsync(string userId, CreateReportDto dto)
        {
            var report = new DisasterReport
            {
                ReportedByUserId = userId,
                Type = dto.Type,
                Description = dto.Description,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                LocationName = dto.LocationName ?? string.Empty,
                ImageUrl = dto.ImageBase64 ?? dto.ImageUrl ?? null, 
                Status = ReportStatus.Pending
            };

            _db.DisasterReports.Add(report);
            await _db.SaveChangesAsync();
            return report;
        }


        public async Task<Disaster> MergeIntoExistingDisasterAsync(int reportId, int disasterId)
        {
            var report = await _db.DisasterReports.FindAsync(reportId)
                ?? throw new Exception("Report not found.");

            if (report.Status == ReportStatus.Merged)
                throw new Exception($"Report {reportId} is already merged into Disaster {report.DisasterId}.");

            if (report.Status == ReportStatus.Rejected)
                throw new Exception($"Report {reportId} was rejected and cannot be merged.");

            var disaster = await _db.Disasters.FindAsync(disasterId)
                ?? throw new Exception($"Disaster {disasterId} not found.");

            report.DisasterId = disasterId;
            report.Status = ReportStatus.Merged;
            await _db.SaveChangesAsync();

            return disaster;
        }


        public async Task<Disaster> CreateDisasterFromReportAsync(int reportId, CreateDisasterFromReportDto dto)
        {
            var report = await _db.DisasterReports.FindAsync(reportId)
                ?? throw new Exception("Report not found.");

            if (report.Status == ReportStatus.Merged)
                throw new Exception($"Report {reportId} is already merged into Disaster {report.DisasterId}. Cannot create a second disaster from it.");

            if (report.Status == ReportStatus.Rejected)
                throw new Exception($"Report {reportId} was rejected and cannot be converted to a disaster.");

            var disaster = new Disaster
            {
                Type = report.Type,                        
                Severity = dto.Severity,
                AffectedAreaRadiusKm = dto.AffectedAreaRadiusKm,
                Latitude = report.Latitude,
                Longitude = report.Longitude,
                Description = report.Description,
                Source = DisasterSource.CitizenReport,
                Status = DisasterStatus.UnderVerification,
                ReportedAt = DateTime.UtcNow
            };

            _db.Disasters.Add(disaster);
            await _db.SaveChangesAsync();

            report.DisasterId = disaster.Id;
            report.Status = ReportStatus.Merged;
            await _db.SaveChangesAsync();

            return disaster;
        }
        public async Task<DisasterReport> RejectReportAsync(int reportId, string? reason)
        {
            var report = await _db.DisasterReports.FindAsync(reportId)
                ?? throw new Exception("Report not found");

            report.Status = ReportStatus.Rejected;
            await _db.SaveChangesAsync();
            return report;
        }

        
        public async Task<List<DisasterReport>> GetNearbyPendingReportsAsync(double lat, double lon, double radiusKm)
        {
            var pending = await _db.DisasterReports
                .Where(r => r.Status == ReportStatus.Pending)
                .ToListAsync();  

            return pending
                .Where(r => DistanceCalculator.CalculateKm(lat, lon, r.Latitude, r.Longitude) <= radiusKm)
                .ToList();
        }
    }
}

