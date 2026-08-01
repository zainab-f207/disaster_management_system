using DisasterPreparedness_ResponseSystem.Core.DTOs;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AdvisoriesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IPreparednessAdvisoryService _advisoryService;

        public AdvisoriesController(AppDbContext db, IPreparednessAdvisoryService advisoryService)
        {
            _db = db;
            _advisoryService = advisoryService;
        }

        // GET /api/advisories?includeAcknowledged=false
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool includeAcknowledged = false)
        {
            var query = _db.PreparednessAdvisories.AsQueryable();
            if (!includeAcknowledged) query = query.Where(a => !a.Acknowledged);

            var advisories = await query
                .Where(a => a.ForecastFor >= DateTime.UtcNow.Date) 
                .OrderBy(a => a.ForecastFor)
                .Select(a => new PreparednessAdvisoryDto(
                    a.Id, a.City, a.Latitude, a.Longitude, a.Type, a.Severity,
                    a.ForecastFor, a.Message, a.CreatedAt, a.Acknowledged))
                .ToListAsync();

            return Ok(advisories);
        }

        // PUT /api/advisories/5/acknowledge
        [HttpPut("{id}/acknowledge")]
        [Authorize(Roles = "Admin,Responder")]
        public async Task<IActionResult> Acknowledge(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var advisory = await _advisoryService.AcknowledgeAsync(id, userId);
                return Ok(new { Message = "Advisory acknowledged.", advisory.Id });
            }
            catch (Exception ex)
            {
                return NotFound(new { Error = ex.Message });
            }
        }
    }
}
