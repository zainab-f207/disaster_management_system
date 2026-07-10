using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AlertsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AlertsController(AppDbContext db) => _db = db;

        /// <summary>
        /// Retrieve all alerts with optional filtering by disaster ID.
        /// Open to all users. Returns most recent alerts first.
        /// </summary>
        /// <remarks>
        /// Alerts are automatically generated when:
        /// - A new disaster report is submitted
        /// - A disaster is verified by Admin
        /// - A responder assignment status is updated
        /// 
        /// Severity values: Low, Medium, High, Critical.
        /// Audience values: Public (citizens), Responders, Admin.
        /// </remarks>
        /// <param name="disasterId">Optional: Filter alerts by specific disaster ID. If omitted, returns all alerts.</param>
        /// <returns>List of alerts with ID, message, severity, audience, and timestamp</returns>
        // GET /api/alerts?disasterId=8
        // GET /api/alerts — all alerts, most recent first
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? disasterId)
        {
            var query = _db.Alerts.AsQueryable();
            if (disasterId.HasValue) query = query.Where(a => a.DisasterId == disasterId);

            var alerts = await query
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new
                {
                    a.Id,
                    a.DisasterId,
                    a.Message,
                    Severity = a.Severity.ToString(),
                    Audience = a.Audience.ToString(),
                    a.CreatedAt
                })
                .ToListAsync();

            return Ok(alerts);
        }
    }
}

