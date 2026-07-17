using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.BackgroundServices
{
    /// <summary>
    /// Runs daily at 08:00 PKT and sends a disaster incident summary email to the admin.
    /// </summary>
    public class DailyIncidentReportService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<DailyIncidentReportService> _logger;

        public DailyIncidentReportService(
            IServiceScopeFactory scopeFactory,
            IConfiguration config,
            ILogger<DailyIncidentReportService> logger)
        {
            _scopeFactory = scopeFactory;
            _config = config;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Daily Incident Report Service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                TimeZoneInfo pkTimeZone;
                try { pkTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Pakistan Standard Time"); }
                catch { pkTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Karachi"); }

                var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, pkTimeZone);
                var nextRun = now.Date.AddHours(8);
                if (now >= nextRun) nextRun = nextRun.AddDays(1);

                var delay = nextRun - now;
                _logger.LogInformation("Daily report scheduled in {Hours:F1} hours.", delay.TotalHours);

                try
                {
                    await Task.Delay(delay, stoppingToken);
                    await SendDailyReportAsync();
                }
                catch (OperationCanceledException) { break; }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending daily incident report.");
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                }
            }
        }

        public async Task SendDailyReportAsync()
        {
            var adminEmail = _config["EmailSettings:AdminEmail"];
            if (string.IsNullOrWhiteSpace(adminEmail))
            {
                _logger.LogWarning("AdminEmail not configured in EmailSettings. Skipping daily report.");
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var db       = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var emailSvc = scope.ServiceProvider.GetRequiredService<IEmailService>();

            var since = DateTime.UtcNow.AddHours(-24);

            var disasters = await db.Disasters
                .Where(d => d.ReportedAt >= since)
                .OrderByDescending(d => d.ReportedAt)
                .ToListAsync();

            var reportCount = await db.DisasterReports
                .Where(r => r.CreatedAt >= since)
                .CountAsync();

            var activeCount = await db.Disasters
                .Where(d => d.Status == DisasterStatus.ResponseInProgress || d.Status == DisasterStatus.Verified)
                .CountAsync();

            var sb = new StringBuilder();
            sb.Append(@"<!DOCTYPE html>
<html><head><meta charset='UTF-8'/>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
.wrap{max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.header{background:linear-gradient(135deg,#145c33,#1a7a44);color:#fff;padding:32px 40px}
.header h1{margin:0;font-size:24px;font-weight:800}
.header p{margin:8px 0 0;opacity:.8;font-size:14px}
.body{padding:32px 40px}
.stats{display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap}
.stat{flex:1;min-width:120px;background:#f8f9fa;border-radius:10px;padding:20px;text-align:center;border-top:3px solid #145c33}
.num{font-size:36px;font-weight:900;color:#145c33}
.lbl{font-size:12px;color:#666;margin-top:4px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th{background:#f0f4f1;padding:10px 14px;text-align:left;font-size:11px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f0f0f0;color:#333}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700}
.red{background:#fee2e2;color:#c0392b}
.orange{background:#fef3c7;color:#d97706}
.green{background:#d1fae5;color:#065f46}
.grey{background:#f0f0f0;color:#555}
.footer{background:#f8f9fa;padding:20px 40px;font-size:12px;color:#888;text-align:center;border-top:1px solid #e8e8e8}
</style></head><body><div class='wrap'>
<div class='header'>
  <h1>&#127477;&#127472; Pakistan Disaster Response System</h1>
  <p>Daily Incident Summary &mdash; ");
            sb.Append(DateTime.UtcNow.AddHours(5).ToString("dddd, dd MMMM yyyy"));
            sb.Append(@"</p></div>
<div class='body'>
<div class='stats'>
  <div class='stat'><div class='num'>");
            sb.Append(disasters.Count);
            sb.Append(@"</div><div class='lbl'>New Disasters (24h)</div></div>
  <div class='stat'><div class='num'>");
            sb.Append(reportCount);
            sb.Append(@"</div><div class='lbl'>Citizen Reports (24h)</div></div>
  <div class='stat'><div class='num'>");
            sb.Append(activeCount);
            sb.Append(@"</div><div class='lbl'>Active Incidents</div></div>
</div>");

            if (disasters.Any())
            {
                sb.Append(@"<h3 style='font-size:15px;color:#222;margin:0 0 12px'>New Disasters in Last 24 Hours</h3>
<table>
<tr><th>Type</th><th>Coordinates</th><th>Severity</th><th>Status</th><th>Time (PKT)</th></tr>");
                foreach (var d in disasters)
                {
                    var sevStr = d.Severity.ToString();
                    var badgeCls = sevStr switch
                    {
                        "Critical" => "red",
                        "High"     => "orange",
                        "Medium"   => "grey",
                        _          => "green"
                    };
                    sb.Append($@"<tr>
  <td><strong>{d.Type}</strong></td>
  <td style='font-size:11px;color:#888'>{d.Latitude:F3}, {d.Longitude:F3}</td>
  <td><span class='badge {badgeCls}'>{sevStr}</span></td>
  <td>{d.Status}</td>
  <td>{d.ReportedAt.AddHours(5):HH:mm}</td>
</tr>");
                }
                sb.Append("</table>");
            }
            else
            {
                sb.Append("<p style='color:#666;font-size:14px;margin:0'>&#x2705; No new disasters reported in the last 24 hours.</p>");
            }

            sb.Append(@"</div>
<div class='footer'>
  This report is sent automatically every morning at 8:00 AM PKT.<br/>
  Pakistan Disaster Response &amp; Management System &mdash; NDMA
</div></div></body></html>");

            var subject = $"[PDRS Daily Report] {disasters.Count} new disaster(s) — {DateTime.UtcNow.AddHours(5):dd MMM yyyy}";
            await emailSvc.SendEmailAsync(adminEmail, subject, sb.ToString());
            _logger.LogInformation("Daily incident report sent to {Email}.", adminEmail);
        }
    }
}
