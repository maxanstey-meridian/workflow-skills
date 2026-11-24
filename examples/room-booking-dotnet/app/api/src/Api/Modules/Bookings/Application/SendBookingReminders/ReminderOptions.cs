namespace Cowork.Api.Modules.Bookings.Application.SendBookingReminders;

/// <summary>
/// When the reminder email goes out. Configuration owns the values; the
/// use case owns the rule (the evening before, in the space's time zone).
/// </summary>
public sealed class ReminderOptions
{
    public const string SectionName = "Cowork:Reminders";

    /// <summary>The space's time zone; "the evening before" is an evening here.</summary>
    public string TimeZoneId { get; set; } = "Europe/London";

    /// <summary>The local hour the reminder runs, so it arrives while the member can still act on it.</summary>
    public int EveningHourLocal { get; set; } = 18;
}
