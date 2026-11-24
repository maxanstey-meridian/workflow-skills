using Cowork.Api.Modules.Rooms.Application.AddRoom;
using Cowork.Api.Modules.Rooms.Application.ListRooms;
using Cowork.Api.Modules.Rooms.Application.Ports;
using Cowork.Api.Modules.Rooms.Contracts;
using Cowork.Api.Modules.Rooms.Infrastructure;
using FluentValidation;

namespace Cowork.Api.Modules.Rooms;

public static class RoomsModule
{
    public static IServiceCollection AddRoomsModule(this IServiceCollection services)
    {
        services.AddScoped<RoomRepository, EfRoomRepository>();
        services.AddScoped<RoomDirectory, EfRoomDirectory>();
        services.AddScoped<AddRoomUseCase>();
        services.AddScoped<ListRoomsQuery>();
        services.AddScoped<IValidator<AddRoomCommand>, AddRoomCommandValidator>();
        return services;
    }
}
