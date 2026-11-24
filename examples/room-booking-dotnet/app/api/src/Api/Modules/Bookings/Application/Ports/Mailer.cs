namespace Cowork.Api.Modules.Bookings.Application.Ports;

public sealed record BookingReminderEmail(string ToEmail, string RoomName, DateTimeOffset StartsAt);

public interface Mailer
{
    public Task SendBookingReminderAsync(
        BookingReminderEmail reminder,
        CancellationToken cancellationToken
    );
}
