using FluentValidation;
using RoomBooking.Api.Modules.Rooms.Application;
using RoomBooking.Api.Modules.Rooms.Application.Ports;
using RoomBooking.Api.Modules.Rooms.Contracts;
using RoomBooking.Api.Modules.Rooms.Infrastructure;

namespace RoomBooking.Api.Modules.Rooms;

public static class RoomsModule
{
    public static IServiceCollection AddRoomsModule(this IServiceCollection services)
    {
        services.AddSingleton<IValidator<AddRoomCommand>, AddRoomCommandValidator>();
        services.AddScoped<IRoomRepository, RoomRepository>();
        services.AddScoped<IRoomCatalog, RoomCatalog>();
        services.AddScoped<IRoomFinder, RoomFinder>();
        services.AddScoped<AddRoomUseCase>();
        services.AddScoped<ListRoomsQuery>();
        return services;
    }
}
