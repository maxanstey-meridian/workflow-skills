using FluentValidation;
using RoomBooking.Api.Modules.Bookings.Application;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Infrastructure;
using RoomBooking.Api.Modules.Bookings.Infrastructure.Scheduling;

namespace RoomBooking.Api.Modules.Bookings;

public static class BookingsModule
{
    public static IServiceCollection AddBookingsModule(this IServiceCollection services)
    {
        services.AddOptions<BookingSchedulingOptions>().BindConfiguration("Scheduling");
        services.AddSingleton<IValidator<BookRoomCommand>, BookRoomCommandValidator>();
        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<IBookingFinder, BookingFinder>();
        services.AddScoped<IEmailSender, LoggingEmailSender>();
        services.AddScoped<BookRoomUseCase>();
        services.AddScoped<CancelBookingUseCase>();
        services.AddScoped<CheckInBookingUseCase>();
        services.AddScoped<ReleaseStaleBookingsUseCase>();
        services.AddScoped<SendDueBookingRemindersUseCase>();
        services.AddScoped<MyBookingsQuery>();
        services.AddScoped<RoomAvailabilityQuery>();

        // The sweepers are singletons; each resolves its use case through a fresh scope per
        // run. Scheduling:Enabled=false turns both into no-ops (tests call the use cases
        // directly, with their own clock).
        services.AddSingleton<ReleaseSweeper>();
        services.AddSingleton<ReminderSweeper>();
        services.AddHostedService(sp => sp.GetRequiredService<ReleaseSweeper>());
        services.AddHostedService(sp => sp.GetRequiredService<ReminderSweeper>());

        return services;
    }
}
