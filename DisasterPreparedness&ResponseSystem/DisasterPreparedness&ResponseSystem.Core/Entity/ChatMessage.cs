using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class ChatMessage
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }         
        public string SenderId { get; set; } = string.Empty;
        public ApplicationUser Sender { get; set; } = null!;
        public string SenderName { get; set; } = string.Empty;   
        public string SenderRole { get; set; } = string.Empty;   
        public string Message { get; set; } = string.Empty;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }
}
