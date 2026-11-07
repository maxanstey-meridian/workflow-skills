using System.Diagnostics;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
/// The one mapping from a lifecycle refusal to its declared failure. It owns
/// the error codes and wording; every use case goes through it and never
/// builds one at the call site.
/// </summary>
public static class BookingRefusalMapping
{
    public static AppError ToFailure(BookingRefusal refusal)
    {
        var (code, message) = RefusalText(refusal);
        return new AppError(code, message, FailureStatus.Conflict);
    }

    private static (string Code, string Message) RefusalText(BookingRefusal refusal) =>
        refusal switch
        {
            BookingRefusal.Cancelled => ("booking_cancelled", "This booking has been cancelled."),
            BookingRefusal.Released => (
                "booking_released",
                "This booking was released because it was not checked in."
            ),
            BookingRefusal.AlreadyCheckedIn => (
                "booking_already_checked_in",
                "This booking is already checked in."
            ),
            BookingRefusal.CheckInNotOpenYet => (
                "booking_check_in_not_open",
                "Check-in opens when the booking starts."
            ),
            BookingRefusal.CheckInClosed => (
                "booking_check_in_closed",
                "Check-in closed 15 minutes after the start."
            ),
            BookingRefusal.BookingHasStarted => (
                "booking_already_started",
                "The booking has started and can no longer be cancelled."
            ),
            _ => throw new UnreachableException($"{refusal} has no failure wording"),
        };
}
