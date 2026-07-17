using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            var host     = _config["EmailSettings:Host"]     ?? "smtp.gmail.com";
            var port     = int.TryParse(_config["EmailSettings:Port"], out var p) ? p : 587;
            var username = _config["EmailSettings:Username"] ?? "";
            var password = _config["EmailSettings:Password"] ?? "";
            var from     = _config["EmailSettings:From"]     ?? username;
            var localDir = _config["EmailSettings:LocalPickupDirectory"];

            var mail = new MailMessage
            {
                From       = new MailAddress(from, "Pakistan DRS"),
                Subject    = subject,
                Body       = htmlBody,
                IsBodyHtml = true
            };
            mail.To.Add(toEmail);

            if (!string.IsNullOrWhiteSpace(localDir))
            {
                // ── Dev mode: dump .eml files to disk ────────────────────────
                System.IO.Directory.CreateDirectory(localDir);
                using var devClient = new SmtpClient
                {
                    DeliveryMethod         = SmtpDeliveryMethod.SpecifiedPickupDirectory,
                    PickupDirectoryLocation = localDir
                };
                await devClient.SendMailAsync(mail);
            }
            else
            {
                // ── Production: real SMTP (Gmail etc.) ───────────────────────
                using var prodClient = new SmtpClient(host, port)
                {
                    EnableSsl            = true,
                    UseDefaultCredentials = false,
                    Credentials          = new NetworkCredential(username, password),
                    Timeout              = 20_000
                };
                await prodClient.SendMailAsync(mail);
            }
        }
    }
}
