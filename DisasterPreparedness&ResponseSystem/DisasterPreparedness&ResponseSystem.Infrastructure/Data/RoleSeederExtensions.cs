using DisasterPreparedness_ResponseSystem.Core.Entity;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Data
{
    public static class RoleSeederExtensions
    {
        public static async Task SeedIdentityDataAsync(this WebApplication app)
        {
            using var scope = app.Services.CreateScope();

            var roleManager = scope.ServiceProvider
                .GetRequiredService<RoleManager<IdentityRole>>();

            var userManager = scope.ServiceProvider
                .GetRequiredService<UserManager<ApplicationUser>>();

            await RoleSeeder.SeedRolesAsync(roleManager);

            var config = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            await RoleSeeder.SeedAdminUserAsync(userManager, config);
        }
    }
}