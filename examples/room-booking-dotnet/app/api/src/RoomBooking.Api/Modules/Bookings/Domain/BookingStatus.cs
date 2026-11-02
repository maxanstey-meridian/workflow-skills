namespace RoomBooking.Api.Modules.Bookings.Domain;

/// <summary>
///     The integer values are pinned by the overlap constraint's SQL
///     (<c>status IN (1, 2)</c> marks the states that hold a room).
/// </summary>
public enum BookingStatus
{
    Booked = 1,
    CheckedIn = 2,
    Cancelled = 3,
    Released = 4,
}
