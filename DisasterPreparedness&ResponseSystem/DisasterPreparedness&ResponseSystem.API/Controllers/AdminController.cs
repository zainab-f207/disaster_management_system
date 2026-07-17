using DisasterPreparedness_ResponseSystem.Infrastructure.BackgroundServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly DailyIncidentReportService _reportService;

        public AdminController(DailyIncidentReportService reportService)
        {
            _reportService = reportService;
        }

        /// <summary>
        /// Manually trigger the daily incident summary email to the admin address.
        /// </summary>
        [HttpPost("send-daily-report")]
        public async Task<IActionResult> SendDailyReport()
        {
            await _reportService.SendDailyReportAsync();
            return Ok(new { Message = "Daily incident report sent to the configured admin email." });
        }
    }
}
