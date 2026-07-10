using DisasterPreparedness_ResponseSystem.Core.DTOs;
using DisasterPreparedness_ResponseSystem.Core.Entity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Interfaces
{
    public interface IReportService
    {
        Task<DisasterReport> CreateReportAsync(string userId, CreateReportDto dto);
        Task<Disaster> MergeIntoExistingDisasterAsync(int reportId, int disasterId);
        Task<Disaster> CreateDisasterFromReportAsync(int reportId, CreateDisasterFromReportDto dto);
        Task<DisasterReport> RejectReportAsync(int reportId, string? reason);
        Task<List<DisasterReport>> GetNearbyPendingReportsAsync(double lat, double lon, double radiusKm);
    }
}
