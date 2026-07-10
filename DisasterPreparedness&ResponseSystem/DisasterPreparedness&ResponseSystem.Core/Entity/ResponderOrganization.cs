using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class ResponderOrganization
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public OrganizationType Type { get; set; }
        public string ContactNumber { get; set; } = string.Empty;
        public double BaseLatitude { get; set; }
        public double BaseLongitude { get; set; }
        public bool IsActive { get; set; } = true;
        public ICollection<ApplicationUser> Members { get; set; } = new List<ApplicationUser>();
        public ICollection<ResponderAssignment> Assignments { get; set; } = new List<ResponderAssignment>();
    }
}
