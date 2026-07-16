using Microsoft.AspNetCore.Mvc;

namespace DisasterPreparedness_ResponseSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HistoricalEventsController : ControllerBase
{
    private readonly IHttpClientFactory _clientFactory;
    public HistoricalEventsController(IHttpClientFactory clientFactory) => _clientFactory = clientFactory;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var client = _clientFactory.CreateClient();
        var csv = await client.GetStringAsync(
            "https://data.humdata.org/dataset/94ccdbb8-9ba7-4c83-bf3e-d5fd53da1793/resource/bdcb808b-0a7f-4664-9eba-86d1902635e0/download/pak_glide_events.csv");
        return Content(csv, "text/csv");
    }
}
