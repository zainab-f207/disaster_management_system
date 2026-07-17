using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.DTOs
{
    public record RegisterDto(
     string FullName,
     string Email,
     string Password,
     string PhoneNumber,
     string Role,                          
     int? ResponderOrganizationId          
 );

    public record LoginDto(
        string Email,
        string Password
    );

    public record AuthResponseDto(
        string Token,
        string UserId,
        string FullName,
        string Email,
        string Role,
        int? OrganizationId,
        DateTime ExpiresAt
    );
}
