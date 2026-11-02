namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
///     Bound from config "Scheduling" in the module registration. The reminder wall time and
///     zone belong to the members' day; <c>Enabled</c> turns the host's sweepers off, so tests
///     (and any deployment that prefers) can drive the use cases directly.
/// </summary>
public sealed class BookingSchedulingOptions
{
    public string TimeZoneId { get; set; } = "Europe/London";

    public int ReminderAtHour { get; set; } = 18;

    public int ReminderAtMinute { get; set; } = 30;

    public bool Enabled { get; set; } = true;
}
