using RoomBooking.Api.Modules.Identity.Application;
using RoomBooking.Api.Modules.Identity.Infrastructure;

namespace RoomBooking.Api.Modules.Identity;

/// <summary>Identity module registration.</summary>
public static class IdentityModule
{
    public static IServiceCollection AddIdentity(this IServiceCollection services)
    {
        services.AddScoped<IUsersQueries, EfUsersQueries>();
        services.AddScoped<IUserLookup, EfUserLookup>();
        services.AddScoped<ListUsers>();
        return services;
    }
}
