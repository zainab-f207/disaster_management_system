using DisasterPreparedness_ResponseSystem.Core.Entity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Interfaces
{
    public interface IResponderAssignmentService
    {
        Task<ResponderAssignment> AutoAssignAsync(int disasterId);
        Task<ResponderAssignment> OverrideAssignmentAsync(int assignmentId, int newOrgId, string adminUserId);
    }
}
