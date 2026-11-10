using System.Text.Json;
using Cowork.Api.Common;
using Cowork.Api.Infrastructure;
using Cowork.Api.Infrastructure.Adapters;
using Cowork.Api.Infrastructure.Auth;
using Cowork.Api.Infrastructure.Jobs;
using Cowork.Api.Modules.Bookings;
using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Rooms;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Rivet;

// The API's security, declared in source: every endpoint requires the dev persona header
// unless it says otherwise, so --check and generation read the same document.
[assembly: RivetSecurityScheme("dev", "apiKey", parameterName: "X-Dev-User", location: "header")]
[assembly: RivetGlobalSecurity(0)]
[assembly: RivetGlobalSecurityScheme(0, "dev", new string[0])]

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddHttpContextAccessor();

var connectionString =
    builder.Configuration.GetConnectionString("Cowork")
    ?? throw new InvalidOperationException("Connection string 'Cowork' is required.");
builder.Services.AddDbContext<CoworkDbContext>(options => options.UseNpgsql(connectionString));

builder.Services.AddSingleton(TimeProvider.System);
builder
    .Services.AddOptions<SpaceOptions>()
    .Bind(builder.Configuration.GetSection(SpaceOptions.SectionName))
    .ValidateOnStart();
builder
    .Services.AddOptions<DevUserOptions>()
    .Bind(builder.Configuration.GetSection(DevUserOptions.SectionName))
    .ValidateOnStart();
builder.Services.AddSingleton<IValidateOptions<SpaceOptions>, OptionsValidator>();
builder.Services.AddSingleton<IValidateOptions<DevUserOptions>, OptionsValidator>();

// The development authentication handler signs the caller in as a dev persona from the
// X-Dev-User header; a real deployment replaces it and the policies stay unchanged.
builder
    .Services.AddAuthentication(DevAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, DevAuthenticationHandler>(
        DevAuthenticationHandler.SchemeName,
        _ => { }
    );
builder
    .Services.AddAuthorizationBuilder()
    .AddPolicy("Staff", policy => policy.RequireRole("Staff"));

builder.Services.AddRoomsModule();
builder.Services.AddBookingsModule();
builder.Services.AddSingleton<ISpaceClock, SpaceClock>();
builder.Services.AddScoped<ICurrentMember, ClaimsCurrentMember>();
builder.Services.AddScoped<IMemberDirectory, ConfigMemberDirectory>();
builder.Services.AddScoped<IRoomDirectory, RoomsModuleRoomDirectory>();
builder.Services.AddScoped<IBookingReminders, LoggedBookingReminders>();

builder.Services.AddHostedService<BookingReleaseSweeper>();
builder.Services.AddHostedService<BookingReminderDispatcher>();

// Undeclared failures surface once, here, as a 500 in the error envelope.
builder.Services.AddExceptionHandler(options =>
{
    options.ExceptionHandler = async context =>
    {
        if (context.Features.Get<IExceptionHandlerFeature>() is not { } feature)
        {
            return;
        }

        var exception = feature.Error;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(
            exception,
            "Unhandled exception on {Method} {Path}",
            context.Request.Method,
            context.Request.Path
        );
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(
            JsonSerializer.Serialize(
                new ErrorResponse("internal_error", "Something went wrong; please try again.")
            )
        );
    };
});

var app = builder.Build();

// The demo database is local and owned by this app; it migrates itself at startup.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CoworkDbContext>();
    db.Database.Migrate();
}

app.UseExceptionHandler(_ => { });
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

/// <summary>Exposes Program to WebApplicationFactory in the tests.</summary>
public partial class Program { }
