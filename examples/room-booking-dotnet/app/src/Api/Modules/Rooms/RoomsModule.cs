using Cowork.Api.Modules.Rooms.Application.AddRoom;
using Cowork.Api.Modules.Rooms.Application.ListRooms;
using Cowork.Api.Modules.Rooms.Application.Ports;
using Cowork.Api.Modules.Rooms.Infrastructure;

namespace Cowork.Api.Modules.Rooms;

public static class RoomsModule
{
    public static IServiceCollection AddRoomsModule(this IServiceCollection services)
    {
        services.AddSingleton<CreateRoomRequestValidator>();
        services.AddScoped<AddRoomUseCase>();
        services.AddScoped<ListRoomsQuery>();
        services.AddScoped<IRoomRepository, PostgresRoomRepository>();
        services.AddScoped<IRoomQueries, PostgresRoomQueries>();
        return services;
    }
}
