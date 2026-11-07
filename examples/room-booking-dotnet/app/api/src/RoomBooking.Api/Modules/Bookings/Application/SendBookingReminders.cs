using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
/// Sends reminder emails for next day's bookings in the business time zone.
/// One email per booking, idempotent by ReminderSentAtUtc, so a rerun never
/// sends twice.
/// </summary>
public sealed class SendBookingReminders(
    IBookingQueries queries,
    IBookingRepository bookings,
    IEmailSender email
)
{
    // Reminder emails run the evening before their booking: at SendRemindersAtLocal
    // in the business zone, before the member's evening winds down, with each
    // booking's send spread by a stable hash of its id over SendSpreadWindow so a
    // batch never stampedes and a rerun lands in the same slot. If the process is
    // down when the window opens, undelivered reminders still go out afterwards.
    public static readonly TimeSpan SendRemindersAtLocal = TimeSpan.FromHours(18);
    public static readonly TimeSpan SendSpreadWindow = TimeSpan.FromMinutes(20);

    public async Task<int> ExecuteAsync(
        DateTime nowUtc,
        TimeZoneInfo businessZone,
        CancellationToken ct
    )
    {
        var local = TimeZoneInfo.ConvertTime(
            DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc),
            businessZone
        );
        if (local.TimeOfDay < SendRemindersAtLocal)
        {
            return 0;
        }

        var remindersFor = local.Date.AddDays(1);
        var windowStartUtc = ConvertToUtc(remindersFor, businessZone);
        var windowEndUtc = ConvertToUtc(remindersFor.AddDays(1), businessZone);
        var due = await queries.ListDueForReminderAsync(windowStartUtc, windowEndUtc, ct);

        var sent = 0;
        foreach (
            var booking in due.Where(b => local.TimeOfDay >= SendRemindersAtLocal + Spread(b.Id))
        )
        {
            await email.SendAsync(Compose(booking, businessZone), ct);
            await bookings.MarkReminderSentAsync(booking.Id, nowUtc, ct);
            sent += 1;
        }

        return sent;
    }

    /// <summary>The spread slot for one booking, derived from its stable id.</summary>
    public static TimeSpan Spread(Guid bookingId)
    {
        var windowSeconds = (int)SendSpreadWindow.TotalSeconds;
        var seconds = ((bookingId.GetHashCode() % windowSeconds) + windowSeconds) % windowSeconds;
        return TimeSpan.FromSeconds(seconds);
    }

    private static DateTime ConvertToUtc(DateTime localDateTime, TimeZoneInfo zone) =>
        TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(localDateTime, DateTimeKind.Unspecified),
            zone
        );

    private static EmailMessage Compose(BookingRow booking, TimeZoneInfo zone)
    {
        var startLocal = TimeZoneInfo.ConvertTime(
            DateTime.SpecifyKind(booking.StartUtc, DateTimeKind.Utc),
            zone
        );
        var endLocal = TimeZoneInfo.ConvertTime(
            DateTime.SpecifyKind(booking.EndUtc, DateTimeKind.Utc),
            zone
        );
        var subject = $"Reminder: {booking.RoomName} tomorrow {startLocal:HH:mm}-{endLocal:HH:mm}";
        var body =
            $"Your booking of {booking.RoomName} starts tomorrow at {startLocal:HH:mm}. "
            + $"Check in between {startLocal:HH:mm} and {startLocal.Add(BookingLifecycle.CheckInGrace):HH:mm}, "
            + "or the room will be released for other members.";
        return new EmailMessage(booking.MemberEmail, subject, body);
    }
}
