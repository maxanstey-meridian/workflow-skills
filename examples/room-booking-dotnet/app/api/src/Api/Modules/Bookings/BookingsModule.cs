using Cowork.Api.Modules.Bookings.Application.BookRoom;
using Cowork.Api.Modules.Bookings.Application.CancelBooking;
using Cowork.Api.Modules.Bookings.Application.CheckInBooking;
using Cowork.Api.Modules.Bookings.Application.ListAvailableRooms;
using Cowork.Api.Modules.Bookings.Application.ListMyBookings;
using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Application.ReleaseExpiredBookings;
using Cowork.Api.Modules.Bookings.Application.SendBookingReminders;
using Cowork.Api.Modules.Bookings.Infrastructure;
using FluentValidation;

namespace Cowork.Api.Modules.Bookings;

public static class BookingsModule
{
    public static IServiceCollection AddBookingsModule(this IServiceCollection services)
    {
        // Module dependency claim: Bookings -> Rooms. A booking cannot keep
        // its rules without rooms (a booking references an existing room and
        // its read models name it), so Bookings consumes Rooms' published
        // RoomDirectory contract.
        services.AddScoped<BookingRepository, EfBookingRepository>();
        services.AddScoped<Mailer, LoggingMailer>();
        services.AddScoped<BookRoomUseCase>();
        services.AddScoped<CancelBookingUseCase>();
        services.AddScoped<CheckInBookingUseCase>();
        services.AddScoped<ListMyBookingsQuery>();
        services.AddScoped<ListAvailableRoomsQuery>();
        services.AddScoped<ReleaseExpiredBookingsUseCase>();
        services.AddScoped<SendBookingRemindersUseCase>();
        services.AddScoped<IValidator<BookRoomCommand>, BookRoomCommandValidator>();
        services.AddHostedService<ReleaseExpiredBookingsWorker>();
        services.AddHostedService<BookingReminderWorker>();
        return services;
    }
}
