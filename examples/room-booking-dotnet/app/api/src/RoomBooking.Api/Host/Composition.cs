using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Host.DevAuthentication;
using RoomBooking.Api.Host.Persistence;
using RoomBooking.Api.Modules.Bookings;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Rooms;
using RoomBooking.Api.Modules.Rooms.Contracts;
using RoomBooking.Api.Modules.Users;
using RoomBooking.Api.Modules.Users.Contracts;
using RoomBooking.Api.Modules.Users.Domain;

namespace RoomBooking.Api.Host;

/// <summary>Host wiring: persistence, modules, auth, and startup initialization.</summary>
public static class Composition
{
    public static IServiceCollection AddHost(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var connectionString = configuration.GetConnectionString("Database");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "The connection string 'ConnectionStrings:Database' is not configured."
            );
        }

        services.AddDbContext<RoomBookingDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<DevSeeder>();
        services.AddSingleton<TimeProvider>(TimeProvider.System);

        // Undeclared exceptions become a ProblemDetails 5xx through the global exception handler.
        services.AddProblemDetails();

        // The SPA on http://localhost:3000 calls this API during development. Program applies
        // the policy in Development only.
        services.AddCors(options =>
            options.AddDefaultPolicy(policy =>
                policy.WithOrigins("http://localhost:3000").AllowAnyHeader().AllowAnyMethod()
            )
        );

        services
            .AddAuthentication(DevAuthHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, DevAuthHandler>(
                DevAuthHandler.SchemeName,
                configureOptions: null
            );
        services.AddAuthorization(options =>
        {
            options.AddPolicy("Authenticated", policy => policy.RequireAuthenticatedUser());
            options.AddPolicy(
                "Staff",
                policy => policy.RequireClaim(ClaimTypes.Role, nameof(UserRole.Staff))
            );
            options.AddPolicy(
                "Member",
                policy => policy.RequireClaim(ClaimTypes.Role, nameof(UserRole.Member))
            );
        });

        services.AddUsersModule();
        services.AddRoomsModule();
        services.AddBookingsModule();

        // Cross-module bridges: Bookings' consumer-owned ports resolve against the other
        // modules' published contracts. This is the only place siblings see each other.
        services.AddScoped<IRoomDirectory>(sp => new RoomDirectoryBridge(
            sp.GetRequiredService<IRoomCatalog>()
        ));
        services.AddScoped<IMemberContacts>(sp => new MemberContactsBridge(
            sp.GetRequiredService<IUserDirectory>()
        ));

        return services;
    }

    public static async Task InitializeAsync(WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RoomBookingDbContext>();
        await db.Database.MigrateAsync();
        if (app.Environment.IsDevelopment())
        {
            await scope
                .ServiceProvider.GetRequiredService<DevSeeder>()
                .SeedAsync(CancellationToken.None);
        }
    }
}

/// <summary>Bridges Bookings' required port onto the Rooms module's published catalog.</summary>
public sealed class RoomDirectoryBridge(IRoomCatalog rooms) : IRoomDirectory
{
    public Task<RoomSummary?> FindAsync(Guid roomId, CancellationToken cancellationToken)
    {
        return rooms.FindAsync(roomId, cancellationToken);
    }
}

/// <summary>Bridges Bookings' required port onto the Users module's published directory.</summary>
public sealed class MemberContactsBridge(IUserDirectory users) : IMemberContacts
{
    public async Task<MemberContact?> FindAsync(Guid memberId, CancellationToken cancellationToken)
    {
        var user = await users.FindByIdAsync(memberId, cancellationToken);
        return user is null ? null : new MemberContact(user.Id, user.Name, user.Email);
    }
}
