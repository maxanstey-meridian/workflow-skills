namespace Cowork.Api.Modules.Bookings.Domain;

/// <summary>
/// The time rules of a booking's hold, in one place so the decider, the release sweep,
/// and the database constraint all quote the same numbers.
/// </summary>
public static class BookingWindows
{
    /// <summary>How long before its start a member may check in to a booking.</summary>
    public static readonly TimeSpan CheckInOpensBeforeStart = TimeSpan.FromMinutes(15);

    /// <summary>
    /// A booking not checked in within this long after its start is released, and the room
    /// becomes free for another booking.
    /// </summary>
    public static readonly TimeSpan ReleaseGraceAfterStart = TimeSpan.FromMinutes(15);
}
