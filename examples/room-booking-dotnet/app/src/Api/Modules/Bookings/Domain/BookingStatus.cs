namespace Cowork.Api.Modules.Bookings.Domain;

/// <summary>
/// The states a booking moves through. Only <see cref="Booked"/> and <see cref="CheckedIn"/>
/// hold the room; a cancelled or released booking frees it for someone else.
/// </summary>
public enum BookingStatus
{
    Booked,

    CheckedIn,

    Cancelled,

    Released,
}
