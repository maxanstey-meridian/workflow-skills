using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Rooms.Contracts;
using Microsoft.Extensions.Options;

namespace Cowork.Api.Modules.Bookings.Application.SendBookingReminders;

public sealed record SendBookingRemindersResult(int SentCount);

public sealed class SendBookingRemindersUseCase(
    BookingRepository bookings,
    RoomDirectory rooms,
    Mailer mailer,
    TimeProvider time,
    IOptions<ReminderOptions> options
)
{
    public async Task<SendBookingRemindersResult> ExecuteAsync(CancellationToken cancellationToken)
    {
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(options.Value.TimeZoneId);
        var local = TimeZoneInfo.ConvertTime(time.GetUtcNow(), timeZone);
        var tomorrowLocal = local.Date.AddDays(1);
        var from = ToUtc(tomorrowLocal, timeZone);
        var until = ToUtc(tomorrowLocal.AddDays(1), timeZone);

        var due = await bookings.ListReminderDueAsync(from, until, cancellationToken);
        if (due.Count == 0)
        {
            return new SendBookingRemindersResult(0);
        }

        var roomNames = (await rooms.AllAsync(cancellationToken)).ToDictionary(
            r => r.Id,
            r => r.Name
        );
        var sent = 0;
        foreach (var booking in due)
        {
            await mailer.SendBookingReminderAsync(
                new BookingReminderEmail(
                    booking.MemberEmail,
                    roomNames.GetValueOrDefault(booking.RoomId, "Unknown room"),
                    booking.StartsAt
                ),
                cancellationToken
            );
            if (
                await bookings.MarkReminderSentAsync(
                    booking.Id,
                    time.GetUtcNow(),
                    cancellationToken
                )
            )
            {
                sent++;
            }
        }

        return new SendBookingRemindersResult(sent);
    }

    private static DateTimeOffset ToUtc(DateTime local, TimeZoneInfo timeZone) =>
        new(
            TimeZoneInfo.ConvertTimeToUtc(
                DateTime.SpecifyKind(local, DateTimeKind.Unspecified),
                timeZone
            )
        );
}
