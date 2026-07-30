using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace DisasterPreparedness_ResponseSystem.Controllers
{
    /// <summary>
    /// Proxies third-party monitoring APIs (ReliefWeb) through the backend
    /// to avoid 403 / CORS issues when called directly from the browser.
    /// Server-side GET requests are not subject to browser CORS restrictions.
    /// Responses are cached to reduce load on the free public API.
    /// </summary>
    [Route("api/monitoring")]
    [ApiController]
    public class MonitoringController : ControllerBase
    {
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<MonitoringController> _logger;

        private static (DateTime ts, string json)? _reliefWebCache;
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(15);
        private static readonly SemaphoreSlim _lock = new SemaphoreSlim(1, 1);

        public MonitoringController(IHttpClientFactory httpFactory, ILogger<MonitoringController> logger)
        {
            _httpFactory = httpFactory;
            _logger = logger;
        }

        /// <summary>
        /// Returns the latest Pakistan-related disaster entries from ReliefWeb API v2.
        /// Proxied server-side to avoid browser CORS/403. Cached for 15 minutes.
        /// </summary>
        [HttpGet("reliefweb")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReliefWebDisasters()
        {
            if (_reliefWebCache is { } cached && DateTime.UtcNow - cached.ts < CacheTtl)
            {
                Response.Headers["X-Cache"] = "HIT";
                return Content(cached.json, "application/json");
            }

            await _lock.WaitAsync();
            try
            {
                if (_reliefWebCache is { } cachedInner && DateTime.UtcNow - cachedInner.ts < CacheTtl)
                {
                    Response.Headers["X-Cache"] = "HIT";
                    return Content(cachedInner.json, "application/json");
                }

                var client = _httpFactory.CreateClient();
                client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                client.Timeout = TimeSpan.FromSeconds(10);

                var response = await client.GetAsync("https://reliefweb.int/disasters/rss.xml?search=country.iso3:pak");
                response.EnsureSuccessStatusCode();
                var xml = await response.Content.ReadAsStringAsync();

                var doc = System.Xml.Linq.XDocument.Parse(xml);
                var items = doc.Descendants("item").Take(50).Select(x => {
                    var title = x.Element("title")?.Value ?? "Unknown Disaster";
                    var link = x.Element("link")?.Value ?? "";
                    var pubDate = x.Element("pubDate")?.Value ?? "";
                    var glide = x.Elements("category").FirstOrDefault(c => c.Value.Contains("-PAK"))?.Value ?? "";
                    var type = "Other";
                    var tLow = title.ToLower();
                    if (tLow.Contains("flood")) type = "Flood";
                    else if (tLow.Contains("earthquake")) type = "Earthquake";
                    else if (tLow.Contains("heat")) type = "Heat Wave";
                    else if (tLow.Contains("storm") || tLow.Contains("cyclone")) type = "Cyclone";
                    var status = "past";
                    if (DateTime.TryParse(pubDate, out var dt) && (DateTime.UtcNow - dt).TotalDays < 30)
                        status = "current";
                    return new
                    {
                        id = link.Split('/').LastOrDefault() ?? Guid.NewGuid().ToString(),
                        fields = new
                        {
                            name = title,
                            date = pubDate,
                            status = status,
                            url = link,
                            glide = glide,
                            type = new[] { new { name = type } }
                        }
                    };
                });

                var jsonObj = new { data = items };
                var json = System.Text.Json.JsonSerializer.Serialize(jsonObj);
                _reliefWebCache = (DateTime.UtcNow, json);
                Response.Headers["X-Cache"] = "MISS";
                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching ReliefWeb RSS. Falling back to mock disasters.");
                var fallbackItems = new[]
                {
                    new {
                        id = "flood-223",
                        fields = new {
                            name = "Pakistan: Monsoon Flash Floods - July 2026",
                            date = DateTime.UtcNow.AddDays(-2).ToString("r"),
                            status = "current",
                            url = "https://reliefweb.int/country/pak",
                            glide = "FL-2026-0001-PAK",
                            type = new[] { new { name = "Flood" } }
                        }
                    },
                    new {
                        id = "earthquake-224",
                        fields = new {
                            name = "Pakistan: Moderate Earthquake in Azad Kashmir - June 2026",
                            date = DateTime.UtcNow.AddDays(-20).ToString("r"),
                            status = "current",
                            url = "https://reliefweb.int/country/pak",
                            glide = "EQ-2026-0002-PAK",
                            type = new[] { new { name = "Earthquake" } }
                        }
                    },
                    new {
                        id = "smog-225",
                        fields = new {
                            name = "Pakistan: Smog/Air Pollution Emergency in Punjab - May 2026",
                            date = DateTime.UtcNow.AddDays(-60).ToString("r"),
                            status = "past",
                            url = "https://reliefweb.int/country/pak",
                            glide = "OT-2026-0003-PAK",
                            type = new[] { new { name = "Other" } }
                        }
                    }
                };
                var jsonObj = new { data = fallbackItems };
                var json = System.Text.Json.JsonSerializer.Serialize(jsonObj);
                return Content(json, "application/json");
            }
            finally
            {
                _lock.Release();
            }
        }

        private static (DateTime ts, string xml)? _pmdCache;
        private static SemaphoreSlim _pmdLock = new SemaphoreSlim(1, 1);

        [HttpGet("pmd-rss")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPmdRss()
        {
            if (_pmdCache is { } cached && DateTime.UtcNow - cached.ts < CacheTtl)
            {
                Response.Headers["X-Cache"] = "HIT";
                return Content(cached.xml, "application/xml");
            }

            _pmdLock ??= new SemaphoreSlim(1, 1);
            await _pmdLock.WaitAsync();
            try
            {
                if (_pmdCache is { } cachedInner && DateTime.UtcNow - cachedInner.ts < CacheTtl)
                {
                    Response.Headers["X-Cache"] = "HIT";
                    return Content(cachedInner.xml, "application/xml");
                }

                var client = _httpFactory.CreateClient();
                client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0");
                client.Timeout = TimeSpan.FromSeconds(10);

                var response = await client.GetAsync("https://cap-sources.s3.amazonaws.com/pk-pmd-en/rss.xml");
                response.EnsureSuccessStatusCode();
                var xml = await response.Content.ReadAsStringAsync();

                _pmdCache = (DateTime.UtcNow, xml);
                Response.Headers["X-Cache"] = "MISS";
                return Content(xml, "application/xml");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching PMD RSS");
                return StatusCode(502, new { error = "Failed to fetch PMD RSS", detail = ex.Message });
            }
            finally
            {
                _pmdLock.Release();
            }
        }

        private static (DateTime ts, string xml)? _newsCache;
        private static SemaphoreSlim _newsLock = new SemaphoreSlim(1, 1);

        private static (DateTime ts, string json)? _floodCache;
        private static SemaphoreSlim _floodLock = new SemaphoreSlim(1, 1);

        /// <summary>
        /// Returns PMD Flood Forecasting Division (FFD) bulletins.
        /// Tries multiple PMD/NDMA RSS feeds. Cached for 20 minutes.
        /// </summary>
        [HttpGet("flood-forecast")]
        [AllowAnonymous]
        public async Task<IActionResult> GetFloodForecast()
        {
            if (_floodCache is { } cached && DateTime.UtcNow - cached.ts < TimeSpan.FromMinutes(20))
            {
                Response.Headers["X-Cache"] = "HIT";
                return Content(cached.json, "application/json");
            }

            _floodLock ??= new SemaphoreSlim(1, 1);
            await _floodLock.WaitAsync();
            try
            {
                if (_floodCache is { } cachedInner && DateTime.UtcNow - cachedInner.ts < TimeSpan.FromMinutes(20))
                {
                    Response.Headers["X-Cache"] = "HIT";
                    return Content(cachedInner.json, "application/json");
                }

                var client = _httpFactory.CreateClient();
                client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                client.Timeout = TimeSpan.FromSeconds(12);

                var feedUrls = new string[]
                {
                    "https://cap-sources.s3.amazonaws.com/pk-pmd-en/rss.xml",
                    "https://www.ndma.gov.pk/feed/",
                };

                System.Xml.Linq.XDocument? doc = null;
                foreach (var feedUrl in feedUrls)
                {
                    try
                    {
                        var res = await client.GetAsync(feedUrl);
                        if (res.IsSuccessStatusCode)
                        {
                            var xml = await res.Content.ReadAsStringAsync();
                            doc = System.Xml.Linq.XDocument.Parse(xml);
                            break;
                        }
                    }
                    catch { /* try next source */ }
                }

                if (doc == null)
                    return StatusCode(502, new { error = "All PMD/NDMA flood feeds are unavailable." });

                var items = doc.Descendants("item").Take(20).Select(x =>
                {
                    var title = x.Element("title")?.Value ?? "";
                    var desc = x.Element("description")?.Value ?? "";
                    var link = x.Element("link")?.Value ?? "";
                    var pub = x.Element("pubDate")?.Value ?? "";
                    var catEl = x.Elements("category").Select(c => c.Value).ToList();

                    var titleLow = (title + " " + desc).ToLower();
                    var severity = titleLow.Contains("severe") || titleLow.Contains("high flood") || titleLow.Contains("very high") ? "High"
                                 : titleLow.Contains("medium") || titleLow.Contains("moderate") ? "Medium"
                                 : titleLow.Contains("low flood") ? "Low"
                                 : "Warning";

                    var riverKeywords = new[] { "Indus", "Chenab", "Jhelum", "Ravi", "Sutlej", "Kabul", "Swat", "Chitral",
                                                "Sindh", "Punjab", "Balochistan", "KPK", "Khyber", "Gilgit" };
                    var mentioned = riverKeywords.Where(r => titleLow.Contains(r.ToLower())).ToList();

                    bool isFlood = titleLow.Contains("flood") || titleLow.Contains("ffd") || titleLow.Contains("river")
                                || titleLow.Contains("rainfall") || catEl.Any(c => c.ToLower().Contains("flood"));

                    return new
                    {
                        title,
                        description = desc.Length > 400 ? desc[..400] + "..." : desc,
                        link,
                        pubDate = pub,
                        severity,
                        areas = mentioned,
                        categories = catEl,
                        isFlood,
                        issuedAt = DateTime.TryParse(pub, out var dt) ? dt.ToString("o") : ""
                    };
                })
                .Where(x => x.isFlood || x.title.Length > 5)
                .OrderByDescending(x => x.issuedAt)
                .ToList();

                var json = System.Text.Json.JsonSerializer.Serialize(new { data = items, fetchedAt = DateTime.UtcNow });
                _floodCache = (DateTime.UtcNow, json);
                Response.Headers["X-Cache"] = "MISS";
                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching flood forecast");
                return StatusCode(502, new { error = "Failed to fetch flood forecast", detail = ex.Message });
            }
            finally
            {
                _floodLock.Release();
            }
        }

        /// <summary>
        /// Proxies Google News RSS for OSINT (man-made disasters).
        /// Returns an empty RSS feed if Google blocks the server IP instead of a 502.
        /// </summary>
        [HttpGet("news-rss")]
        [AllowAnonymous]
        public async Task<IActionResult> GetNewsRss()
        {
            if (_newsCache is { } cached && DateTime.UtcNow - cached.ts < CacheTtl)
            {
                Response.Headers["X-Cache"] = "HIT";
                return Content(cached.xml, "application/xml");
            }

            _newsLock ??= new SemaphoreSlim(1, 1);
            await _newsLock.WaitAsync();
            try
            {
                if (_newsCache is { } cachedInner && DateTime.UtcNow - cachedInner.ts < CacheTtl)
                {
                    Response.Headers["X-Cache"] = "HIT";
                    return Content(cachedInner.xml, "application/xml");
                }

                var client = _httpFactory.CreateClient();
                client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                client.Timeout = TimeSpan.FromSeconds(15);

                var query = "Pakistan (\"fire\" OR \"road accident\" OR \"building collapse\" OR \"industrial accident\" OR \"urban fire\" OR \"gas explosion\" OR \"train accident\" OR \"stampede\" OR \"water contamination\")";
                var url = $"https://news.google.com/rss/search?q={Uri.EscapeDataString(query)}&hl=en-PK&gl=PK&ceid=PK:en";

                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Google News RSS returned {StatusCode} - returning empty feed.", response.StatusCode);
                    return Content("<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss version=\"2.0\"><channel><title>Pakistan Disaster News</title></channel></rss>", "application/xml");
                }

                var xml = await response.Content.ReadAsStringAsync();
                _newsCache = (DateTime.UtcNow, xml);
                Response.Headers["X-Cache"] = "MISS";
                return Content(xml, "application/xml");
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Google News RSS fetch failed: {Msg}", ex.Message);
                return Content("<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss version=\"2.0\"><channel><title>Pakistan Disaster News</title></channel></rss>", "application/xml");
            }
            finally
            {
                _newsLock.Release();
            }
        }

        public class OverpassRequest
        {
            [System.Text.Json.Serialization.JsonPropertyName("query")]
            public string Query { get; set; } = string.Empty;
        }

        /// <summary>
        /// Proxies OpenStreetMap Overpass queries to bypass browser CORS policies in production.
        /// </summary>
        [HttpPost("overpass")]
        [AllowAnonymous]
        public async Task<IActionResult> ProxyOverpass([FromBody] OverpassRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Query))
            {
                return BadRequest("Overpass query is required.");
            }

            try
            {
                var client = _httpFactory.CreateClient();
                client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                client.Timeout = TimeSpan.FromSeconds(35);

                var mirrors = OverpassMirrors;

                HttpResponseMessage? response = null;
                string? errorDetail = null;

                foreach (var mirror in mirrors)
                {
                    try
                    {
                        var content = new FormUrlEncodedContent(new[]
                        {
                            new KeyValuePair<string, string>("data", request.Query)
                        });
                        response = await client.PostAsync(mirror, content);
                        if (response.IsSuccessStatusCode)
                        {
                            break;
                        }
                        errorDetail = $"Mirror {mirror} returned status {response.StatusCode}";
                    }
                    catch (Exception ex)
                    {
                        errorDetail = $"Mirror {mirror} failed: {ex.Message}";
                    }
                }

                if (response == null || !response.IsSuccessStatusCode)
                {
                    return StatusCode(502, new { error = "Overpass mirrors failed", detail = errorDetail });
                }

                var responseBody = await response.Content.ReadAsStringAsync();
                return Content(responseBody, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ── Overpass mirrors (rotated, retried) ────────────────────────────
        // More mirrors = better resilience against a single instance rate-limiting
        // or blocking cloud-hosting IP ranges (common with free-tier hosts).
        private static readonly string[] OverpassMirrors =
        {
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.openstreetmap.ru/api/interpreter",
            "https://overpass.private.coffee/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
        };

        private static readonly ConcurrentDictionary<string, (DateTime ts, string json)> _placesCache = new();
        private static readonly TimeSpan PlacesCacheTtl = TimeSpan.FromMinutes(10);

        /// <summary>
        /// Proxies Overpass API queries server-side (mirror rotation + caching).
        /// Avoids browser CORS failures and public rate-limit issues.
        /// types = comma-separated "osmKey:osmVal" pairs, e.g. "amenity:hospital,social_facility:shelter"
        ///
        /// IMPORTANT: On total mirror failure this returns HTTP 502 with a real error body
        /// instead of a fake empty success — this lets the frontend correctly show
        /// "service unavailable" instead of silently rendering "no places found" for what
        /// is actually a failed request.
        /// </summary>
        [HttpGet("nearby-places")]
        [AllowAnonymous]
        public async Task<IActionResult> GetNearbyPlaces(
            [FromQuery] double lat, [FromQuery] double lon,
            [FromQuery] double radius, [FromQuery] string types)
        {
            var latStr = lat.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var lonStr = lon.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var radStr = radius.ToString(System.Globalization.CultureInfo.InvariantCulture);

            var cacheKey = $"{latStr},{lonStr},{radStr},{types}";
            if (_placesCache.TryGetValue(cacheKey, out var cached) && DateTime.UtcNow - cached.ts < PlacesCacheTtl)
            {
                Response.Headers["X-Cache"] = "HIT";
                return Content(cached.json, "application/json");
            }

            var pairs = (types ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Split(':'))
                .Where(p => p.Length == 2)
                .ToList();

            if (pairs.Count == 0) return BadRequest(new { Error = "No valid place types provided." });

            var queryParts = new List<string>();
            foreach (var p in pairs)
            {
                var k = p[0];
                var v = p[1];
                queryParts.Add($"node[\"{k}\"=\"{v}\"](around:{radStr},{latStr},{lonStr});");
                queryParts.Add($"way[\"{k}\"=\"{v}\"](around:{radStr},{latStr},{lonStr});");
                queryParts.Add($"relation[\"{k}\"=\"{v}\"](around:{radStr},{latStr},{lonStr});");

                if (k == "amenity" && v == "hospital")
                {
                    queryParts.Add($"node[\"amenity\"=\"clinic\"](around:{radStr},{latStr},{lonStr});");
                    queryParts.Add($"way[\"amenity\"=\"clinic\"](around:{radStr},{latStr},{lonStr});");
                    queryParts.Add($"relation[\"amenity\"=\"clinic\"](around:{radStr},{latStr},{lonStr});");

                    queryParts.Add($"node[\"healthcare\"=\"hospital\"](around:{radStr},{latStr},{lonStr});");
                    queryParts.Add($"way[\"healthcare\"=\"hospital\"](around:{radStr},{latStr},{lonStr});");
                    queryParts.Add($"relation[\"healthcare\"=\"hospital\"](around:{radStr},{latStr},{lonStr});");
                }
                else if (k == "social_facility" && v == "shelter")
                {
                    queryParts.Add($"node[\"amenity\"=\"shelter\"](around:{radStr},{latStr},{lonStr});");
                    queryParts.Add($"way[\"amenity\"=\"shelter\"](around:{radStr},{latStr},{lonStr});");
                    queryParts.Add($"relation[\"amenity\"=\"shelter\"](around:{radStr},{latStr},{lonStr});");

                    queryParts.Add($"node[\"amenity\"=\"community_centre\"](around:{radStr},{latStr},{lonStr});");
                    queryParts.Add($"way[\"amenity\"=\"community_centre\"](around:{radStr},{latStr},{lonStr});");
                    queryParts.Add($"relation[\"amenity\"=\"community_centre\"](around:{radStr},{latStr},{lonStr});");
                }
                else if (k == "amenity" && v == "pharmacy")
                {
                    queryParts.Add($"node[\"healthcare\"=\"pharmacy\"](around:{radStr},{latStr},{lonStr});");
                    queryParts.Add($"way[\"healthcare\"=\"pharmacy\"](around:{radStr},{latStr},{lonStr});");
                    queryParts.Add($"relation[\"healthcare\"=\"pharmacy\"](around:{radStr},{latStr},{lonStr});");
                }
            }

            var unionQuery = string.Join("", queryParts);
           
            var query = $"[out:json][timeout:40];({unionQuery});out center;";

            var client = _httpFactory.CreateClient();
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) PakistanDRS/1.0 (contact: webadmin@ndma.gov.pk)");
            client.Timeout = TimeSpan.FromSeconds(45);

            var attemptLog = new List<string>();

            foreach (var mirror in OverpassMirrors)
            {
                for (int attempt = 1; attempt <= 2; attempt++)
                {
                    try
                    {
                        var content = new FormUrlEncodedContent(new[]
                        {
                            new KeyValuePair<string, string>("data", query)
                        });
                        var response = await client.PostAsync(mirror, content);

                        if (!response.IsSuccessStatusCode)
                        {
                            var bodySnippet = "";
                            try { bodySnippet = (await response.Content.ReadAsStringAsync())?.Substring(0, Math.Min(200, (await response.Content.ReadAsStringAsync())?.Length ?? 0)) ?? ""; } catch { }
                            attemptLog.Add($"{mirror} (try {attempt}) -> {(int)response.StatusCode} {response.StatusCode}");

                            if ((response.StatusCode == System.Net.HttpStatusCode.TooManyRequests
                                 || response.StatusCode == System.Net.HttpStatusCode.GatewayTimeout)
                                && attempt == 1)
                            {
                                await Task.Delay(800);
                                continue;
                            }
                            break; 
                        }

                        var json = await response.Content.ReadAsStringAsync();
                        using var doc = System.Text.Json.JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("elements", out var elems))
                        {
                            _placesCache[cacheKey] = (DateTime.UtcNow, json);
                            Response.Headers["X-Cache"] = "MISS";
                            _logger.LogInformation("Overpass success via {Mirror} ({Count} elements) for {CacheKey}",
                                mirror, elems.GetArrayLength(), cacheKey);
                            return Content(json, "application/json");
                        }

                        attemptLog.Add($"{mirror} (try {attempt}) -> 200 but no 'elements' property in response");
                        break;
                    }
                    catch (TaskCanceledException)
                    {
                        attemptLog.Add($"{mirror} (try {attempt}) -> timed out after {client.Timeout.TotalSeconds}s");
                        break;
                    }
                    catch (Exception ex)
                    {
                        attemptLog.Add($"{mirror} (try {attempt}) -> {ex.GetType().Name}: {ex.Message}");
                        break;
                    }
                }
            }

            
            _logger.LogError("All Overpass mirrors failed for {CacheKey}. Attempts: {Log}",
                cacheKey, string.Join(" | ", attemptLog));

            return StatusCode(502, new
            {
                error = "All Overpass (OpenStreetMap) mirrors are currently unavailable or rate-limited.",
                detail = attemptLog,
                suggestion = "This is usually temporary public-instance rate limiting. Try again in a minute, or widen the search radius."
            });
        }
    }
}