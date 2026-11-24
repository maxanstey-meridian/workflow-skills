using Cowork.Api.Auth;
using Cowork.Api.Common;
using Cowork.Api.Modules.Bookings;
using Cowork.Api.Modules.Bookings.Application.SendBookingReminders;
using Cowork.Api.Modules.Rooms;
using Cowork.Api.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Rivet;

// The wire identity scheme: the X-Dev-User header (see DevAuthenticationHandler).
[assembly: RivetSecurityScheme(
    "devUser",
    "apiKey",
    parameterName: "X-Dev-User",
    location: "header",
    description: "Development persona header: '<role>:<email>', e.g. staff:maya@cowork.test or member:alex@cowork.test."
)]
[assembly: RivetGlobalSecurity(0)]
[assembly: RivetGlobalSecurityScheme(0, "devUser", new string[0])]

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Cowork")
    ?? "Host=localhost;Port=55471;Database=cowork_dev;Username=postgres;Password=postgres";
builder.Services.AddDbContext<CoworkDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention()
);
builder.Services.AddSingleton(TimeProvider.System);

builder
    .Services.AddOptions<ReminderOptions>()
    .BindConfiguration(ReminderOptions.SectionName)
    .Validate(
        o => TimeZoneInfo.TryFindSystemTimeZoneById(o.TimeZoneId, out _),
        $"{ReminderOptions.SectionName}:{nameof(ReminderOptions.TimeZoneId)} must be a valid IANA time zone."
    )
    .Validate(
        o => o.EveningHourLocal is >= 0 and <= 23,
        $"{ReminderOptions.SectionName}:{nameof(ReminderOptions.EveningHourLocal)} must be an hour of the day (0-23)."
    )
    .ValidateOnStart();

builder
    .Services.AddAuthentication()
    .AddScheme<AuthenticationSchemeOptions, DevAuthenticationHandler>(
        DevAuthenticationHandler.SchemeName,
        null
    );
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthPolicies.Staff, policy => policy.RequireRole(AuthRoles.Staff));
    options.AddPolicy(AuthPolicies.Member, policy => policy.RequireRole(AuthRoles.Member));
    // Every endpoint requires authentication unless it says otherwise; the
    // anonymous exceptions are deliberate and marked in their handlers.
    options.FallbackPolicy = options.DefaultPolicy;
});

builder.Services.AddRoomsModule();
builder.Services.AddBookingsModule();

builder
    .Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("cowork-api"))
    .WithTracing(tracing => tracing.AddAspNetCoreInstrumentation().AddSource("Rivet"));

var app = builder.Build();

app.UseExceptionHandler(exceptionHandlerApp =>
    exceptionHandlerApp.Run(context =>
    {
        // The one place an undeclared failure is translated: a 5xx error envelope.
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsJsonAsync(
            new ErrorResponse("internal_error", "Something went wrong. Try again."),
            context.RequestAborted
        );
    })
);
app.UseAuthentication();
app.UseAuthorization();

app.MapRoomsEndpoints();
app.MapBookingsEndpoints();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous(); // the one anonymous endpoint: liveness, not a product screen

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<CoworkDbContext>().Database.Migrate();
}

app.Run();

public partial class Program;
