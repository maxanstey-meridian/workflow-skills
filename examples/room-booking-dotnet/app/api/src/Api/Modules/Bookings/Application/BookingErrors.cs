using Cowork.Api.Common;

namespace Cowork.Api.Modules.Bookings.Application;

/// <summary>
/// The one place mapping a lifecycle refusal to its declared failure.
/// </summary>
public static class BookingFailures
{
    public static AppError From(Domain.BookingRefusal refusal) =>
        refusal switch
        {
            Domain.BookingRefusal.AlreadySettled => new(
                "booking.not_active",
                "This booking is no longer active."
            ),
            Domain.BookingRefusal.NotOpenYet => new(
                "booking.check_in_not_open",
                "Check-in opens when the booking starts."
            ),
            Domain.BookingRefusal.WindowClosed => new(
                "booking.check_in_window_closed",
                "Check-in closed 15 minutes after the booking started."
            ),
            _ => throw new InvalidOperationException($"Unhandled refusal {refusal}."),
        };
}

public static class BookingErrors
{
    public static readonly AppError NotFound = new("booking.not_found", "Booking not found.");
    public static readonly AppError SlotTaken = new(
        "booking.slot_taken",
        "That room is already booked for a time overlapping this slot."
    );
    public static readonly AppError InPast = new(
        "time.in_past",
        "A booking cannot start in the past."
    );
}
