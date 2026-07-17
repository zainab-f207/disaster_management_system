using DisasterPreparedness_ResponseSystem.Core.Entity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Data
{
    /// <summary>
    /// Seeds default roles and the default administrator account.
    /// </summary>
    public static class RoleSeeder
    {
        public const string AdminRole = "Admin";
        public const string ResponderRole = "Responder";
        public const string CitizenRole = "Citizen";

        public static readonly string[] Roles =
        {
            AdminRole,
            ResponderRole,
            CitizenRole
        };

        /// <summary>
        /// Creates the default roles if they do not already exist.
        /// </summary>
        public static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
        {
            foreach (var role in Roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }
        }

        /// <summary>
        /// Creates a default administrator account if it does not exist.
        /// </summary>
        public static async Task SeedAdminUserAsync(
            UserManager<ApplicationUser> userManager,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            const string adminEmail = "adminpdrs@gmail.com";
            var adminPassword = configuration["AdminPassword"];
            if (string.IsNullOrEmpty(adminPassword))
            {
                throw new InvalidOperationException("AdminPassword must be configured in user secrets or environment variables.");
            }

            var existingAdmin = await userManager.FindByEmailAsync(adminEmail);

            if (existingAdmin != null)
                return;

            var admin = new ApplicationUser
            {
                FullName = "System Administrator",
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(admin, adminPassword);

            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(admin, AdminRole);
            }
            else
            {
                throw new Exception(
                    $"Failed to create admin user. Errors: {string.Join(", ", result.Errors.Select(e => e.Description))}");
            }
        }

        public static async Task SeedResponderUsersAsync(UserManager<ApplicationUser> userManager, AppDbContext db)
        {
            var rescue1122Lahore = await db.ResponderOrganizations
                .FirstOrDefaultAsync(o => o.Name.Contains("Rescue 1122 Lahore"));
            var edhi = await db.ResponderOrganizations
                .FirstOrDefaultAsync(o => o.Name.Contains("Edhi Foundation Lahore"));
            var pdma = await db.ResponderOrganizations
                .FirstOrDefaultAsync(o => o.Name.Contains("PDMA Punjab"));

            var responders = new[]
            {
        new { Email = "rescue@1122lahore.gov.pk",  Name = "Ahmed Khan",    OrgId = rescue1122Lahore?.Id },
        new { Email = "field@edhilahore.org.pk",   Name = "Bilal Hassan",  OrgId = edhi?.Id },
        new { Email = "officer@pdmapunjab.gov.pk", Name = "Fatima Malik",  OrgId = pdma?.Id },
    };

            foreach (var r in responders)
            {
                if (await userManager.FindByEmailAsync(r.Email) != null) continue;
                var user = new ApplicationUser
                {
                    FullName = r.Name,
                    Email = r.Email,
                    UserName = r.Email,
                    EmailConfirmed = true,
                    ResponderOrganizationId = r.OrgId,
                };
                var result = await userManager.CreateAsync(user, "Responder@1234!");
                if (result.Succeeded)
                    await userManager.AddToRoleAsync(user, "Responder");
            }
        }
    }
}