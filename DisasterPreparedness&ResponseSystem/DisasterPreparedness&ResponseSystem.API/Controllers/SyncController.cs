using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using DisasterPreparedness_ResponseSystem.Core.Entity;

namespace DisasterPreparedness_ResponseSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SyncController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public SyncController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public class SyncRequest
        {
            public string PostgresConnectionString { get; set; } = string.Empty;
        }

        [HttpPost("to-postgres")]
        public async Task<IActionResult> SyncToPostgres([FromBody] SyncRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PostgresConnectionString))
            {
                return BadRequest("Postgres connection string is required.");
            }

            var localConnStr = _configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(localConnStr) || localConnStr.Contains("<USER_SECRET"))
            {
                // Retrieve from user-secrets direct value in runtime configuration
                localConnStr = _configuration["ConnectionStrings:DefaultConnection"];
            }

            if (string.IsNullOrEmpty(localConnStr))
            {
                return BadRequest("Local connection string could not be resolved.");
            }

            try
            {
                // Create local DB options
                var localOptions = new DbContextOptionsBuilder<AppDbContext>()
                    .UseSqlServer(localConnStr)
                    .Options;

                // Parse connection string if it is in URI format
                var remoteConnStr = request.PostgresConnectionString;
                if (remoteConnStr.StartsWith("postgresql://") || remoteConnStr.StartsWith("postgres://"))
                {
                    var uri = new Uri(remoteConnStr);
                    var userInfo = uri.UserInfo.Split(':');
                    var builderDb = new Npgsql.NpgsqlConnectionStringBuilder
                    {
                        Host = uri.Host,
                        Port = uri.IsDefaultPort ? 5432 : uri.Port,
                        Username = userInfo[0],
                        Password = userInfo.Length > 1 ? userInfo[1] : "",
                        Database = uri.LocalPath.TrimStart('/'),
                        SslMode = Npgsql.SslMode.Require,
                        TrustServerCertificate = true
                    };
                    remoteConnStr = builderDb.ToString();
                }

                // Create remote DB options
                var remoteOptions = new DbContextOptionsBuilder<AppDbContext>()
                    .UseNpgsql(remoteConnStr)
                    .Options;

                using var localDb = new AppDbContext(localOptions);
                using var remoteDb = new AppDbContext(remoteOptions);

                // Ensure remote DB schema exists
                await remoteDb.Database.EnsureCreatedAsync();

                // 1. Clear remote database tables using CASCADE to handle foreign keys
                var truncateSql = @"
                    TRUNCATE TABLE 
                        ""FamilyConnections"", 
                        ""ChatMessages"", 
                        ""ResponderLocationPings"", 
                        ""ResponderAssignments"", 
                        ""SafetyChecks"", 
                        ""PushSubscriptions"", 
                        ""Alerts"", 
                        ""DisasterReports"", 
                        ""Disasters"", 
                        ""AspNetUserRoles"", 
                        ""AspNetUsers"", 
                        ""AspNetRoles"", 
                        ""ResponderOrganizations"" 
                    RESTART IDENTITY CASCADE;";

                await remoteDb.Database.ExecuteSqlRawAsync(truncateSql);

                // 2. Fetch all data from SQL Server (as tracking-free objects)
                var roles = await localDb.Roles.AsNoTracking().ToListAsync();
                var users = await localDb.Users.AsNoTracking().ToListAsync();
                var userRoles = await localDb.Set<IdentityUserRole<string>>().AsNoTracking().ToListAsync();
                var orgs = await localDb.ResponderOrganizations.AsNoTracking().ToListAsync();
                var disasters = await localDb.Disasters.AsNoTracking().ToListAsync();
                var reports = await localDb.DisasterReports.AsNoTracking().ToListAsync();
                var alerts = await localDb.Alerts.AsNoTracking().ToListAsync();
                var subs = await localDb.PushSubscriptions.AsNoTracking().ToListAsync();
                var safety = await localDb.SafetyChecks.AsNoTracking().ToListAsync();
                var assignments = await localDb.ResponderAssignments.AsNoTracking().ToListAsync();
                var pings = await localDb.ResponderLocationPings.AsNoTracking().ToListAsync();
                var chats = await localDb.ChatMessages.AsNoTracking().ToListAsync();
                var family = await localDb.FamilyConnections.AsNoTracking().ToListAsync();

                // Force DateTimeKind.Utc on all DateTime properties so Npgsql doesn't throw timezone exception
                ForceUtcDateTimes(roles);
                ForceUtcDateTimes(users);
                ForceUtcDateTimes(orgs);
                ForceUtcDateTimes(disasters);
                ForceUtcDateTimes(reports);
                ForceUtcDateTimes(alerts);
                ForceUtcDateTimes(subs);
                ForceUtcDateTimes(safety);
                ForceUtcDateTimes(assignments);
                ForceUtcDateTimes(pings);
                ForceUtcDateTimes(chats);
                ForceUtcDateTimes(family);

                // 3. Insert into PostgreSQL in dependency order
                if (orgs.Any())
                {
                    await remoteDb.ResponderOrganizations.AddRangeAsync(orgs);
                    await remoteDb.SaveChangesAsync();
                }

                if (roles.Any())
                {
                    await remoteDb.Roles.AddRangeAsync(roles);
                    await remoteDb.SaveChangesAsync();
                }

                if (users.Any())
                {
                    await remoteDb.Users.AddRangeAsync(users);
                    await remoteDb.SaveChangesAsync();
                }

                if (userRoles.Any())
                {
                    await remoteDb.Set<IdentityUserRole<string>>().AddRangeAsync(userRoles);
                    await remoteDb.SaveChangesAsync();
                }

                if (disasters.Any())
                {
                    await remoteDb.Disasters.AddRangeAsync(disasters);
                    await remoteDb.SaveChangesAsync();
                }

                if (reports.Any())
                {
                    await remoteDb.DisasterReports.AddRangeAsync(reports);
                    await remoteDb.SaveChangesAsync();
                }

                if (alerts.Any())
                {
                    await remoteDb.Alerts.AddRangeAsync(alerts);
                    await remoteDb.SaveChangesAsync();
                }

                if (subs.Any())
                {
                    await remoteDb.PushSubscriptions.AddRangeAsync(subs);
                    await remoteDb.SaveChangesAsync();
                }

                if (safety.Any())
                {
                    await remoteDb.SafetyChecks.AddRangeAsync(safety);
                    await remoteDb.SaveChangesAsync();
                }

                if (assignments.Any())
                {
                    await remoteDb.ResponderAssignments.AddRangeAsync(assignments);
                    await remoteDb.SaveChangesAsync();
                }

                if (pings.Any())
                {
                    await remoteDb.ResponderLocationPings.AddRangeAsync(pings);
                    await remoteDb.SaveChangesAsync();
                }

                if (chats.Any())
                {
                    await remoteDb.ChatMessages.AddRangeAsync(chats);
                    await remoteDb.SaveChangesAsync();
                }

                if (family.Any())
                {
                    await remoteDb.FamilyConnections.AddRangeAsync(family);
                    await remoteDb.SaveChangesAsync();
                }

                // 4. Reset sequences in PostgreSQL so future inserts work without ID collisions
                var sequenceSql = @"
                    SELECT setval(pg_get_serial_sequence('""ResponderOrganizations""', 'Id'), COALESCE(MAX(""Id""), 1)) FROM ""ResponderOrganizations"";
                    SELECT setval(pg_get_serial_sequence('""Disasters""', 'Id'), COALESCE(MAX(""Id""), 1)) FROM ""Disasters"";
                    SELECT setval(pg_get_serial_sequence('""DisasterReports""', 'Id'), COALESCE(MAX(""Id""), 1)) FROM ""DisasterReports"";
                    SELECT setval(pg_get_serial_sequence('""Alerts""', 'Id'), COALESCE(MAX(""Id""), 1)) FROM ""Alerts"";
                    SELECT setval(pg_get_serial_sequence('""PushSubscriptions""', 'Id'), COALESCE(MAX(""Id""), 1)) FROM ""PushSubscriptions"";
                    SELECT setval(pg_get_serial_sequence('""SafetyChecks""', 'Id'), COALESCE(MAX(""Id""), 1)) FROM ""SafetyChecks"";
                    SELECT setval(pg_get_serial_sequence('""ResponderAssignments""', 'Id'), COALESCE(MAX(""Id""), 1)) FROM ""ResponderAssignments"";
                    SELECT setval(pg_get_serial_sequence('""ResponderLocationPings""', 'Id'), COALESCE(MAX(""Id""), 1)) FROM ""ResponderLocationPings"";
                    SELECT setval(pg_get_serial_sequence('""ChatMessages""', 'Id'), COALESCE(MAX(""Id""), 1)) FROM ""ChatMessages"";
                    SELECT setval(pg_get_serial_sequence('""FamilyConnections""', 'Id'), COALESCE(MAX(""Id""), 1)) FROM ""FamilyConnections"";";

                try
                {
                    await remoteDb.Database.ExecuteSqlRawAsync(sequenceSql);
                }
                catch (Exception seqEx)
                {
                    // Some tables might not have serial primary keys or are empty; ignore minor sequence reset errors
                    Console.WriteLine($"Sequence reset warning: {seqEx.Message}");
                }

                return Ok(new
                {
                    Message = "Sync completed successfully!",
                    Counts = new
                    {
                        Roles = roles.Count,
                        Users = users.Count,
                        UserRoles = userRoles.Count,
                        Organizations = orgs.Count,
                        Disasters = disasters.Count,
                        Reports = reports.Count,
                        Alerts = alerts.Count,
                        Assignments = assignments.Count
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred during synchronization: {ex.Message}\n{ex.InnerException?.Message}");
            }
        }

        private void ForceUtcDateTimes<T>(IEnumerable<T> entities)
        {
            var properties = typeof(T).GetProperties()
                .Where(p => p.PropertyType == typeof(DateTime) || p.PropertyType == typeof(DateTime?))
                .ToList();

            foreach (var entity in entities)
            {
                if (entity == null) continue;
                foreach (var prop in properties)
                {
                    var val = prop.GetValue(entity);
                    if (val is DateTime dt)
                    {
                        prop.SetValue(entity, DateTime.SpecifyKind(dt, DateTimeKind.Utc));
                    }
                }
            }
        }
    }
}
