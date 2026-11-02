using System.Diagnostics;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
///     The one refusal → declared failure mapping, used by every booking use case. The status
///     travels with the refusal because the contract declares two distinct codes for the one
///     NotActive refusal: a booking that is already cancelled (ALREADY_CANCELLED) and one the
///     release sweep let go (ALREADY_RELEASED) are different situations for the member.
/// </summary>
public static class BookingRefusals
{
    public static DeclaredError ToDeclaredError(BookingRefusal refusal, BookingStatus status)
    {
        return (refusal, status) switch
        {
            (BookingRefusal.NotActive, BookingStatus.Cancelled) => new DeclaredError(
                "ALREADY_CANCELLED",
                "This booking is already cancelled."
            ),
            (BookingRefusal.NotActive, BookingStatus.Released) => new DeclaredError(
                "ALREADY_RELEASED",
                "This booking was released because nobody checked in."
            ),
            (BookingRefusal.NotActive, _) => throw new UnreachableException(
                $"NotActive is impossible for status '{status}'."
            ),
            (BookingRefusal.AlreadyCheckedIn, _) => new DeclaredError(
                "ALREADY_CHECKED_IN",
                "This booking is already checked in."
            ),
            (BookingRefusal.CheckInNotOpen, _) => new DeclaredError(
                "CHECK_IN_NOT_OPEN",
                "Check-in opens when the booking starts."
            ),
            (BookingRefusal.CheckInWindowClosed, _) => new DeclaredError(
                "CHECK_IN_WINDOW_CLOSED",
                "Check-in closes 15 minutes after the start."
            ),
            (BookingRefusal.AlreadyEnded, _) => new DeclaredError(
                "ALREADY_ENDED",
                "This booking has already ended."
            ),
            _ => throw new UnreachableException($"Unhandled booking refusal '{refusal}'."),
        };
    }
}
