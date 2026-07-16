using Microsoft.AspNetCore.Identity;
namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class ApplicationUser : IdentityUser
    {
        public string FullName { get; set; } = string.Empty;
        public int? ResponderOrganizationId { get; set; }
        public ResponderOrganization? ResponderOrganization { get; set; }
        public string AvailabilityStatus { get; set; } = "Offline";
    }
}
