using DisasterPreparedness_ResponseSystem.Core.Entity;
using DisasterPreparedness_ResponseSystem.Core.Interfaces;
using DisasterPreparedness_ResponseSystem.Core.Models;
using DisasterPreparedness_ResponseSystem.Hubs;
using DisasterPreparedness_ResponseSystem.Infrastructure.BackgroundServices;
using DisasterPreparedness_ResponseSystem.Infrastructure.Data;
using DisasterPreparedness_ResponseSystem.Infrastructure.Interfaces;
using DisasterPreparedness_ResponseSystem.Infrastructure.Services;
using DisasterPreparedness_ResponseSystem.Middleware;
using DisasterPreparedness_ResponseSystem.Swagger;
using DisasterPreparedness_ResponseSystem.Validators;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Text;
using System.Linq;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = true;
    options.User.RequireUniqueEmail = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

var jwtKey = builder.Configuration["JwtSettings:Key"]!;
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
        ValidAudience = builder.Configuration["JwtSettings:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };


    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"].FirstOrDefault();
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/disasters"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterDtoValidator>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var path = httpContext.Request.Path;
        var method = httpContext.Request.Method;

        bool isSensitiveWrite = (method == "POST" || method == "PUT") &&
            (path.StartsWithSegments("/api/auth") || path.StartsWithSegments("/api/reports"));

        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var limit = isSensitiveWrite ? 10 : 300;
        var partitionKey = $"{ip}:{(isSensitiveWrite ? "strict" : "normal")}";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: partitionKey,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = limit,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            });
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddSignalR();

builder.Services.AddHttpClient<IWeatherApiService, WeatherApiService>();
builder.Services.AddHttpClient<IEarthquakeApiService, EarthquakeApiService>();
builder.Services.AddHttpClient<IGeocodingService, GeocodingService>();
builder.Services.AddHttpClient<IAirQualityApiService, AirQualityApiService>();

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IResponderAssignmentService, ResponderAssignmentService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IDuplicateCheckService, DuplicateCheckService>();
builder.Services.AddScoped<IAlertService, AlertService>();
builder.Services.AddScoped<IPushNotificationService, PushNotificationService>();
builder.Services.AddScoped<IDisasterCreationService, DisasterCreationService>();
builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.Configure<MonitoringConfig>(
    builder.Configuration.GetSection("DisasterMonitoring"));
builder.Services.AddHostedService<DisasterMonitoringService>();

// Register DailyIncidentReportService as singleton so it can be injected into AdminController
builder.Services.AddSingleton<DailyIncidentReportService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<DailyIncidentReportService>());

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Pakistan Disaster Response System API",
        Version = "v1",
        Description = """
            Real-time disaster preparedness and response system for Pakistan.

            **Roles:**
            - 🔓 Public — no login required
            - 👤 Citizen — submit reports, view disasters
            - 🚒 Responder — update assignment status (Rescue 1122, Edhi, PDMA etc.)
            - 👑 Admin — verify disasters, manage organizations, override assignments

            **Flow:** Citizen Report → Admin Verify → Auto-Assign Responder → Real-time Alert
            """,
        Contact = new OpenApiContact
        {
            Name = "NDMA Pakistan",
            Email = "webadmin@ndma.gov.pk"
        }
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: **Bearer {your token}**\n\nExample: Bearer eyJhbGci..."
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    c.SchemaFilter<EnumSchemaFilter>();

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        try
        {
            var xmlDoc = new System.Xml.XmlDocument();
            xmlDoc.Load(xmlPath);
            c.IncludeXmlComments(xmlPath);
        }
        catch (System.Xml.XmlException ex)
        {
            System.Diagnostics.Debug.WriteLine($"Warning: Failed to load XML comments from {xmlPath}: {ex.Message}");
        }
    }
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",    
                "http://localhost:3000"    
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();         
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var db = services.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    await RoleSeeder.SeedRolesAsync(roleManager);

    var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    var config = services.GetRequiredService<IConfiguration>();
    await RoleSeeder.SeedAdminUserAsync(userManager, config);
    await RoleSeeder.SeedResponderUsersAsync(userManager, db);

    if (!db.ResponderOrganizations.Any())
    {
        db.ResponderOrganizations.AddRange(SeedData.GetSeedOrganizations());
        await db.SaveChangesAsync();
    }
}

app.UseMiddleware<ExceptionMiddleware>();  

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Pakistan Disaster Response API v1");
        c.DocumentTitle = "Pakistan Disaster Response System";
        c.DefaultModelsExpandDepth(-1);      
    });
}

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.UseRateLimiter();
app.UseAuthentication();                   
app.UseAuthorization();
app.MapControllers();
app.MapHub<DisasterHub>("/hubs/disasters");

app.Run();
