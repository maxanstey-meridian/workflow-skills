using RoomBooking.Api.Modules.Bookings.Application;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Infrastructure;

namespace RoomBooking.Api.Modules.Bookings;

/// <summary>Booking module registration.</summary>
public static class BookingModule
{
    public static IServiceCollection AddBooking(this IServiceCollection services)
    {
        services.AddScoped<IRoomRepository, EfRoomRepository>();
        services.AddScoped<IBookingRepository, EfBookingRepository>();
        services.AddScoped<IRoomQueries, EfRoomQueries>();
        services.AddScoped<IBookingQueries, EfBookingQueries>();
        services.AddScoped<IEmailSender, FileEmailSender>();

        services.AddScoped<AddRoom>();
        services.AddScoped<ListRooms>();
        services.AddScoped<ListRoomAvailability>();
        services.AddScoped<BookRoom>();
        services.AddScoped<CancelBooking>();
        services.AddScoped<CheckInBooking>();
        services.AddScoped<ListMyBookings>();
        services.AddScoped<ReleaseStaleBookings>();
        services.AddScoped<SendBookingReminders>();
        return services;
    }
}
