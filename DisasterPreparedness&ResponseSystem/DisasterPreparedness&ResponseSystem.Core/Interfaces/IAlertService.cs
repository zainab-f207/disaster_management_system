using DisasterPreparedness_ResponseSystem.Core.Entity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Interfaces
{
    public interface IAlertService
    {
        Task SendDisasterAlertAsync(Disaster disaster);
        Task SendAssignmentUpdateAsync(ResponderAssignment assignment);
        Task SendNewReportNotificationAsync(DisasterReport report, string reporterName);
        Task SendSystemAlertAsync(string message, int? disasterId = null);
    }

}
