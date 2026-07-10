using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.Interfaces
{
    public interface IDuplicateCheckService
    {
        Task<bool> ActiveDisasterExistsAsync(DisasterType type, double lat, double lon, double radiusKm = 50);
    }
}
