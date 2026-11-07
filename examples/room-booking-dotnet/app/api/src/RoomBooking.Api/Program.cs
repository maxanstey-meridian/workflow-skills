using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Auth;
using RoomBooking.Api.Contracts.Booking;
using RoomBooking.Api.Kernel;
using RoomBooking.Api.Modules.Bookings;
using RoomBooking.Api.Modules.Identity;
using RoomBooking.Api.Persistence;
using RoomBooking.Api.Sweeping;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<BookingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Db"))
);

builder
    .Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = DevAuthenticationHandler.SchemeName;
        options.DefaultChallengeScheme = DevAuthenticationHandler.SchemeName;
    })
    .AddScheme<AuthenticationSchemeOptions, DevAuthenticationHandler>(
        DevAuthenticationHandler.SchemeName,
        _ => { }
    );

builder.Services.AddAuthorization(AuthorizationPolicies.Configure);

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader())
);

// Wire behavior is declared on the contract types themselves ([RivetKebabCaseEnumConverter]),
// not in serializer options — the spec and the runtime must see the same wire.
builder.Services.AddControllers();

builder.Services.AddBooking();
builder.Services.AddIdentity();
builder.Services.AddSingleton<IValidator<AddRoomRequest>, AddRoomRequestValidator>();
builder.Services.AddSingleton<IValidator<BookRoomRequest>, BookRoomRequestValidator>();
builder.Services.AddSingleton(TimeProvider.System);

if (builder.Configuration.GetValue("Scheduling:Enabled", true))
{
    builder.Services.AddHostedService<ReleaseSweeper>();
    builder.Services.AddHostedService<ReminderSweeper>();
}

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
    await db.Database.MigrateAsync();
    await SeedDemoUsers(db);
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Development identities so the demo frontend can act as staff or as a member.
// A real deployment replaces this seeding (and the dev auth handler) with its
// own identity store.
static async Task SeedDemoUsers(BookingDbContext db)
{
    if (await db.Users.AnyAsync())
    {
        return;
    }

    db.Users.AddRange(
        new RoomBooking.Api.Modules.Identity.Domain.User(
            Guid.CreateVersion7(),
            "Ada (staff)",
            "ada@cowork.example",
            ActorRole.Staff
        ),
        new RoomBooking.Api.Modules.Identity.Domain.User(
            Guid.CreateVersion7(),
            "Bo (staff)",
            "bo@cowork.example",
            ActorRole.Staff
        ),
        new RoomBooking.Api.Modules.Identity.Domain.User(
            Guid.CreateVersion7(),
            "Mia (member)",
            "mia@cowork.example",
            ActorRole.Member
        ),
        new RoomBooking.Api.Modules.Identity.Domain.User(
            Guid.CreateVersion7(),
            "Kai (member)",
            "kai@cowork.example",
            ActorRole.Member
        )
    );
    await db.SaveChangesAsync();
}

public partial class Program;
