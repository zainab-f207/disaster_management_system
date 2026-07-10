using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GeocodingController : ControllerBase
    {
        private readonly IGeocodingService _geocoding;
        public GeocodingController(IGeocodingService geocoding) => _geocoding = geocoding;

        /// <summary>
        /// Search for a Pakistan location by name. Returns lat/lon automatically.
        /// Use this before submitting a report — user types area name, you get coordinates.
        /// </summary>
        /// <remarks>
        /// Examples: "DHA Lahore", "Gulshan Karachi", "F-7 Islamabad", "Saddar Peshawar"
        /// </remarks>
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 3)
                return BadRequest(new { Error = "Search query must be at least 3 characters." });

            var results = await _geocoding.SearchLocationsAsync(query);

            if (!results.Any())
                return NotFound(new { Error = $"No locations found in Pakistan for '{query}'." });

            return Ok(results.Select(r => new
            {
                r.DisplayName,
                r.Latitude,
                r.Longitude,
                r.City,
                r.Province,
                // Ready-to-paste into report — user just picks from dropdown
                ReadyToUse = new { r.Latitude, r.Longitude }
            }));
        }

        /// <summary>
        /// Get location name from lat/lon (reverse geocoding).
        /// Useful for displaying human-readable location on disaster cards.
        /// </summary>
        [HttpGet("reverse")]
        public async Task<IActionResult> Reverse([FromQuery] double lat, [FromQuery] double lon)
        {
            try
            {
                // We can reuse the service or call directly
                var client = HttpContext.RequestServices
                    .GetRequiredService<IGeocodingService>();

                // Build reverse geocoding URL manually since our service does forward only
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.UserAgent
                    .ParseAdd("PakistanDisasterResponseSystem/1.0");

                var url = $"https://nominatim.openstreetmap.org/reverse" +
                          $"?lat={lat}&lon={lon}&format=json&addressdetails=1";

                var response = await httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                    return NotFound(new { Error = "Could not reverse geocode this location." });

                var json = await response.Content.ReadAsStringAsync();
                return Ok(new { RawResult = System.Text.Json.JsonDocument.Parse(json).RootElement });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }
    }
}

