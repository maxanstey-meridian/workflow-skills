namespace Cowork.Api.Modules.Bookings.Domain;

/// <summary>
/// The evening-before reminder rule, pure so any caller can quote it: a booking is
/// reminded on the evening (at or after the reminder hour) of the day before its start
/// in the space's own time zone.
/// </summary>
public static class BookingReminderSchedule
{
    public static bool IsDue(
        DateTimeOffset startsAt,
        DateTimeOffset now,
        TimeZoneInfo zone,
        TimeOnly evening
    )
    {
        var localNow = TimeZoneInfo.ConvertTime(now, zone);
        var localStart = TimeZoneInfo.ConvertTime(startsAt, zone);
        return localStart.Date == localNow.Date.AddDays(1)
            && TimeOnly.FromTimeSpan(localNow.TimeOfDay) >= evening;
    }
}
