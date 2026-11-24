namespace Cowork.Api.Modules.Bookings.Domain;

public enum BookingAction
{
    Cancel,
    CheckIn,
}

public enum BookingRefusal
{
    /// <summary>The booking is cancelled, released, or already checked in.</summary>
    AlreadySettled,

    /// <summary>Check-in opens when the booking starts.</summary>
    NotOpenYet,

    /// <summary>The 15-minute check-in window after the start has passed.</summary>
    WindowClosed,
}
