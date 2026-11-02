namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>Zone-aware instants, shared by the reminder pipeline and the availability read.</summary>
public static class ZoneTime
{
    public static TimeZoneInfo Zone(string timeZoneId)
    {
        return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
    }

    /// <summary>The zone-local calendar date of an instant.</summary>
    public static DateOnly LocalDate(DateTimeOffset instant, TimeZoneInfo zone)
    {
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, zone).Date);
    }

    /// <summary>
    ///     The UTC instant of a zone-local wall time. The <see cref="DateTime" /> stays
    ///     Unspecified so the zone's own DST rules resolve it.
    /// </summary>
    public static DateTimeOffset UtcAt(DateOnly date, TimeOnly time, TimeZoneInfo zone)
    {
        return TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(time), zone);
    }
}
