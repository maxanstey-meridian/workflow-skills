namespace Cowork.Api.Modules.Bookings.Domain;

public enum BookingStatus
{
    Booked,
    CheckedIn,
    Cancelled,
    Released,
}

public static class BookingStatuses
{
    /// <summary>Statuses that hold the room; anything else has given it up.</summary>
    public static readonly BookingStatus[] Active = [BookingStatus.Booked, BookingStatus.CheckedIn];
}
