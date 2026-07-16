using DisasterPreparedness_ResponseSystem.Core.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Interfaces
{
    public interface IDisasterHubClient
    {
        Task ReceiveDisasterAlert(RealTimeAlertDto alert);
        Task ReceiveAssignmentUpdate(AssignmentUpdateDto update);
        Task ReceiveNewReport(NewReportNotificationDto report);
        Task ReceiveSystemMessage(string message);
        Task ReceiveResponderLocation(object data);
        Task ReceiveLocationUpdate(LocationUpdateDto update);
    }
}
