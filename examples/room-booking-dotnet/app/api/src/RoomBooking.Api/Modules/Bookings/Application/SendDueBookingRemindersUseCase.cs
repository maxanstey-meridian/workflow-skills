using Microsoft.Extensions.Options;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
///     Sends one reminder email for every due booking: active (Booked or CheckedIn), not yet
///     reminded, and past its reminder instant — the evening before its start, at the
///     configured wall time in the configured zone. At-least-once: a crash between send and
///     mark re-sends the same evening's reminder on the next run.
/// </summary>
public sealed class SendDueBookingRemindersUseCase(
    IBookingFinder bookings,
    IMemberContacts contacts,
    IRoomDirectory rooms,
    IEmailSender email,
    IBookingRepository repository,
    IOptions<BookingSchedulingOptions> scheduling,
    TimeProvider clock,
    ILogger<SendDueBookingRemindersUseCase> logger
)
{
    public async Task<int> ExecuteAsync(CancellationToken cancellationToken)
    {
        var options = scheduling.Value;
        var zone = ZoneTime.Zone(options.TimeZoneId);
        var now = clock.GetUtcNow();
        var sent = 0;
        foreach (var booking in await bookings.ListUnremindedActiveAsync(cancellationToken))
        {
            var reminderAt = ZoneTime.UtcAt(
                ZoneTime.LocalDate(booking.Start, zone).AddDays(-1),
                new TimeOnly(options.ReminderAtHour, options.ReminderAtMinute),
                zone
            );
            if (reminderAt > now)
            {
                continue;
            }

            var contact = await contacts.FindAsync(booking.MemberId, cancellationToken);
            if (contact is null)
            {
                logger.LogWarning(
                    "Skipping the reminder for booking {BookingId}: the member is gone.",
                    booking.Id
                );
                continue;
            }

            var room = await rooms.FindAsync(booking.RoomId, cancellationToken);
            if (room is null)
            {
                logger.LogWarning(
                    "Skipping the reminder for booking {BookingId}: the room is gone.",
                    booking.Id
                );
                continue;
            }

            await email.SendAsync(
                ReminderEmail(booking, contact, room.Name, zone),
                cancellationToken
            );
            booking.MarkReminderSent(now);
            await repository.SaveAsync(cancellationToken);
            sent++;
        }

        return sent;
    }

    private static EmailMessage ReminderEmail(
        Booking booking,
        MemberContact contact,
        string roomName,
        TimeZoneInfo zone
    )
    {
        var localStart = TimeZoneInfo.ConvertTime(booking.Start, zone);
        var subject = FormattableString.Invariant(
            $"Reminder: {roomName} on {localStart:dddd d MMMM yyyy}"
        );
        var body = FormattableString.Invariant(
            $"Hi {contact.Name},\n\nYou have {roomName} booked for {localStart:dddd d MMMM yyyy 'at' h:mm tt}. If you no longer need it, please cancel so someone else can use the room.\n\n— Room Booking"
        );
        return new EmailMessage(contact.Email, subject, body);
    }
}
