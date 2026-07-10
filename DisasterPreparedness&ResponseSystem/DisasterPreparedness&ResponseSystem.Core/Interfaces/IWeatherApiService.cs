using DisasterPreparedness_ResponseSystem.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Interfaces
{
    public interface IWeatherApiService
    {
        Task<CurrentWeather?> GetCurrentWeatherAsync(double latitude, double longitude);
    }
}
