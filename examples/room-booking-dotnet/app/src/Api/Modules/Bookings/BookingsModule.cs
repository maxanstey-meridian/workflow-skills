using Cowork.Api.Infrastructure;
using Cowork.Api.Modules.Bookings.Application.BookRoom;
using Cowork.Api.Modules.Bookings.Application.CancelBooking;
using Cowork.Api.Modules.Bookings.Application.CheckIn;
using Cowork.Api.Modules.Bookings.Application.ListMyBookings;
using Cowork.Api.Modules.Bookings.Application.ListRoomDay;
using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Application.ReleaseExpired;
using Cowork.Api.Modules.Bookings.Application.SendReminders;
using Cowork.Api.Modules.Bookings.Infrastructure;
using Microsoft.Extensions.Options;

namespace Cowork.Api.Modules.Bookings;

public static class BookingsModule
{
    public static IServiceCollection AddBookingsModule(this IServiceCollection services)
    {
        services.AddSingleton<BookRoomRequestValidator>();
        services.AddScoped<BookRoomUseCase>();
        services.AddScoped<CancelBookingUseCase>();
        services.AddScoped<CheckInBookingUseCase>();
        services.AddScoped<ListMyBookingsQuery>();
        services.AddScoped<ListRoomDayQuery>();
        services.AddScoped<ReleaseExpiredBookingsUseCase>();
        services.AddScoped<IBookingRepository, PostgresBookingRepository>();

        // The reminder evening hour is configuration the host validates; the use case takes
        // it as a plain value.
        services.AddScoped<SendBookingRemindersUseCase>(sp =>
        {
            var options = sp.GetRequiredService<IOptions<SpaceOptions>>().Value;
            return new SendBookingRemindersUseCase(
                sp.GetRequiredService<IBookingRepository>(),
                sp.GetRequiredService<IRoomDirectory>(),
                sp.GetRequiredService<IMemberDirectory>(),
                sp.GetRequiredService<IBookingReminders>(),
                sp.GetRequiredService<ISpaceClock>(),
                new TimeOnly(options.ReminderEveningHour, 0),
                sp.GetRequiredService<ILogger<SendBookingRemindersUseCase>>()
            );
        });

        return services;
    }
}
