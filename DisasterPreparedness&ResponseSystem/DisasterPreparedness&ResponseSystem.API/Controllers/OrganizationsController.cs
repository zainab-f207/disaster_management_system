using DisasterPreparedness_ResponseSystem.Core.DTOs;
using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrganizationsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public OrganizationsController(AppDbContext db) => _db = db;

        /// <summary>
        /// Retrieve all responder organizations with optional filtering.
        /// Open to all users. Essential for assigning disasters and viewing responder capacity.
        /// </summary>
        /// <remarks>
        /// Organization types: Rescue1122, Edhi, PDMA, FireDepartment, PoliceRescue, Military, HealthServices, Other.
        /// By default, returns only active organizations. Set activeOnly=false to include deactivated organizations.
        /// Each organization has a base location (latitude, longitude) used for distance-based auto-assignment.
        /// </remarks>
        /// <param name="type">Optional: Filter organizations by type (Rescue1122, Edhi, PDMA, etc.)</param>
        /// <param name="activeOnly">Filter to active organizations only (default: true)</param>
        /// <returns>List of organizations matching the filters with contact info and base location</returns>
        // GET /api/organizations?type=Rescue1122&activeOnly=true
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] OrganizationType? type, [FromQuery] bool activeOnly = true)
        {
            var query = _db.ResponderOrganizations.AsQueryable();
            if (type.HasValue) query = query.Where(o => o.Type == type);
            if (activeOnly) query = query.Where(o => o.IsActive);

            var orgs = await query
                .Select(o => new OrganizationResponseDto(
                    o.Id, o.Name, o.Type, o.ContactNumber, o.BaseLatitude, o.BaseLongitude, o.IsActive))
                .ToListAsync();

            return Ok(orgs);
        }

        /// <summary>
        /// Retrieve a specific responder organization by ID.
        /// Open to all users. Includes organization type, contact details, and base location.
        /// </summary>
        /// <param name="id">The organization ID</param>
        /// <returns>Organization details (name, type, contact number, base coordinates, active status)</returns>
        // GET /api/organizations/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var org = await _db.ResponderOrganizations.FindAsync(id);
            if (org == null) return NotFound();

            return Ok(new OrganizationResponseDto(
                org.Id, org.Name, org.Type, org.ContactNumber, org.BaseLatitude, org.BaseLongitude, org.IsActive));
        }

        /// <summary>
        /// Register a new responder organization.
        /// Restricted to Admin role. Used to onboard new rescue/response entities (e.g., a new district PDMA branch).
        /// </summary>
        /// <remarks>
        /// Organization type must be one of: Rescue1122, Edhi, PDMA, FireDepartment, PoliceRescue, Military, HealthServices, Other.
        /// Base latitude and longitude (organization headquarters) are critical for auto-assignment distance calculations.
        /// All new organizations are created in "active" status.
        /// </remarks>
        /// <param name="dto">Organization data (name, type, contact number, base location)</param>
        /// <returns>The newly created organization record</returns>
        // POST /api/organizations  — admin adds a new responder org (e.g. a new district unit)
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrganizationDto dto)
        {
            var org = new ResponderOrganization
            {
                Name = dto.Name,
                Type = dto.Type,
                ContactNumber = dto.ContactNumber,
                BaseLatitude = dto.BaseLatitude,
                BaseLongitude = dto.BaseLongitude,
                IsActive = true
            };

            _db.ResponderOrganizations.Add(org);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = org.Id }, org);
        }

        /// <summary>
        /// Update an existing responder organization's details.
        /// Restricted to Admin role. Used to modify contact info, base location, or activation status.
        /// </summary>
        /// <remarks>
        /// All fields can be updated: name, contact number, base location, and active status.
        /// Changing base location affects future auto-assignment distance calculations for new disasters.
        /// Note: Organization type cannot be changed after creation.
        /// </remarks>
        /// <param name="id">The organization ID to update</param>
        /// <param name="dto">Updated organization details</param>
        /// <returns>Updated organization record</returns>
        // PUT /api/organizations/5
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateOrganizationDto dto)
        {
            var org = await _db.ResponderOrganizations.FindAsync(id);
            if (org == null) return NotFound();

            org.Name = dto.Name;
            org.ContactNumber = dto.ContactNumber;
            org.BaseLatitude = dto.BaseLatitude;
            org.BaseLongitude = dto.BaseLongitude;
            org.IsActive = dto.IsActive;

            await _db.SaveChangesAsync();
            return Ok(org);
        }

        /// <summary>
        /// Deactivate a responder organization (soft delete).
        /// Restricted to Admin role. Organization records and assignment history are preserved for audit purposes.
        /// </summary>
        /// <remarks>
        /// Soft delete: organization is marked inactive but not permanently removed.
        /// Deactivated organizations will not appear in active-only queries and cannot be assigned new disasters.
        /// Existing assignments to deactivated organizations remain in the database for historical reference.
        /// To restore, Admin must manually reactivate via the Update endpoint.
        /// </remarks>
        /// <param name="id">The organization ID to deactivate</param>
        /// <returns>No content (204) on success</returns>
        // DELETE /api/organizations/5 — soft delete (deactivate), never hard-delete an org with history
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var org = await _db.ResponderOrganizations.FindAsync(id);
            if (org == null) return NotFound();

            org.IsActive = false;  // soft delete — preserves assignment history/foreign keys
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
