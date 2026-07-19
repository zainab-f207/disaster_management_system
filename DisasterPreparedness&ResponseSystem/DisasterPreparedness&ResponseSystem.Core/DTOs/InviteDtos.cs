using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.DTOs
{
    public record InviteResponderDto(string FullName, string Email, string PhoneNumber, int ResponderOrganizationId);
    public record AcceptInviteDto(string Email, string Token, string Password);
}
