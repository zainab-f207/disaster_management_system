using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Core.Interfaces
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string message);
    }
}