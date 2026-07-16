using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.DTOs
{
    public record ChatMessageDto(
        int Id,
        int OrganizationId,
        string SenderId,
        string SenderName,
        string SenderRole,
        string Message,
        DateTime SentAt
    );

    public record SendChatMessageDto(string Message);
}
