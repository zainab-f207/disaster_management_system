using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class FamilyConnection
    {
        public int Id { get; set; }
        public string OwnerUserId { get; set; } = string.Empty;   
        public ApplicationUser OwnerUser { get; set; } = null!;
        public string MemberUserId { get; set; } = string.Empty;  
        public ApplicationUser MemberUser { get; set; } = null!;
        public string Status { get; set; } = "Pending"; 
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
