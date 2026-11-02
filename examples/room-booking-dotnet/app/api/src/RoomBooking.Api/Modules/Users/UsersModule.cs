using RoomBooking.Api.Modules.Users.Application;
using RoomBooking.Api.Modules.Users.Contracts;
using RoomBooking.Api.Modules.Users.Infrastructure;

namespace RoomBooking.Api.Modules.Users;

public static class UsersModule
{
    public static IServiceCollection AddUsersModule(this IServiceCollection services)
    {
        services.AddScoped<IUserDirectory, UserDirectory>();
        services.AddScoped<GetSessionQuery>();
        services.AddScoped<ListUsersQuery>();
        return services;
    }
}
