using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Modules.Bookings.Application.SendReminders;

/// <summary>
/// Sends the evening-before reminder for every booking the reminder rule is due for:
/// at or after the reminder hour in the space's time zone, on the day before the
/// booking's local start date. A failed send is not marked, so the next tick retries it.
/// </summary>
public sealed class SendBookingRemindersUseCase(
    IBookingRepository bookings,
    IRoomDirectory rooms,
    IMemberDirectory members,
    IBookingReminders reminders,
    ISpaceClock clock,
    TimeOnly reminderEvening,
    ILogger<SendBookingRemindersUseCase> logger
)
{
    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        var now = clock.Now;
        var remindable = await bookings.ListRemindableAsync(now, cancellationToken);
        var due = remindable
            .Where(booking =>
                BookingReminderSchedule.IsDue(booking.StartsAt, now, clock.Zone, reminderEvening)
            )
            .ToArray();
        if (due.Length == 0)
        {
            return;
        }

        var roomNames = await rooms.FindNamesAsync(
            due.Select(booking => booking.RoomId).ToArray(),
            cancellationToken
        );
        foreach (var booking in due)
        {
            var member = await members.FindByIdAsync(booking.MemberId, cancellationToken);
            if (member is null)
            {
                logger.LogWarning(
                    "No contact found for member {MemberId}; skipping reminder for booking {BookingId}",
                    booking.MemberId,
                    booking.Id
                );
                continue;
            }

            var roomName = roomNames.GetValueOrDefault(booking.RoomId, "an unnamed room");
            var localStart = TimeZoneInfo.ConvertTime(booking.StartsAt, clock.Zone);
            await SendAsync(booking, member, roomName, localStart, cancellationToken);
        }
    }

    private async Task SendAsync(
        Domain.Booking booking,
        MemberContact member,
        string roomName,
        DateTimeOffset localStart,
        CancellationToken cancellationToken
    )
    {
        var subject = $"Reminder: {roomName} tomorrow at {localStart:HH:mm}";
        var body =
            $"Your booking of {roomName} starts tomorrow, {localStart:dddd d MMMM} at {localStart:HH:mm}. "
            + "Please check in within 15 minutes of the start, or the room will be released.";
        try
        {
            await reminders.SendAsync(member.Email, subject, body, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Failed to send reminder for booking {BookingId} to {Email}; it will be retried",
                booking.Id,
                member.Email
            );
            return;
        }

        booking.MarkReminderSent(clock.Now);
        await bookings.SaveAsync(cancellationToken);
    }
}
