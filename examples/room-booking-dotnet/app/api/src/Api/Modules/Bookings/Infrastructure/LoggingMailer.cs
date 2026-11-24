using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Modules.Bookings.Infrastructure;

/// <summary>
/// The development mailer: reminder emails are written to the log so a run
/// can be watched without an SMTP server. Swap this adapter for a real
/// mailer in production.
/// </summary>
public sealed class LoggingMailer(ILogger<LoggingMailer> logger) : Mailer
{
    public Task SendBookingReminderAsync(
        BookingReminderEmail reminder,
        CancellationToken cancellationToken
    )
    {
        logger.LogInformation(
            "Reminder email to {ToEmail}: \"{RoomName}\" is booked from {StartsAt} to {EndsAt}. Please check in within 15 minutes of the start, or the booking will be released.",
            reminder.ToEmail,
            reminder.RoomName,
            reminder.StartsAt,
            reminder.StartsAt + BookingLifecycle.CheckInWindow
        );
        return Task.CompletedTask;
    }
}
