using DisasterPreparedness_ResponseSystem.Core.Entity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.Interfaces
{
    public interface IPreparednessAdvisoryService
    {
        Task<PreparednessAdvisory?> CreateIfNewAsync(
            string city, double lat, double lon,
            DisasterType type, SeverityLevel severity,
            DateTime forecastFor, string message);

        Task<PreparednessAdvisory> AcknowledgeAsync(int id, string userId);
    }
}
