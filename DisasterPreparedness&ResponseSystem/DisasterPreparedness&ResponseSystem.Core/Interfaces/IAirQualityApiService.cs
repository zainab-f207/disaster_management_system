using DisasterPreparedness_ResponseSystem.Core.Entity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Interfaces
{
    public interface IAirQualityApiService
    {
        Task<AirQualityData?> GetAirQualityAsync(double latitude, double longitude);
    }
}
