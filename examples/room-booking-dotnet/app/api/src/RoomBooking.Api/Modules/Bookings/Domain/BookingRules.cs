namespace RoomBooking.Api.Modules.Bookings.Domain;

/// <summary>The one definition of the booking lifecycle's constants.</summary>
public static class BookingRules
{
    /// <summary>How long after the start an unclaimed booking keeps its room.</summary>
    public static readonly TimeSpan CheckInGrace = TimeSpan.FromMinutes(15);
}
