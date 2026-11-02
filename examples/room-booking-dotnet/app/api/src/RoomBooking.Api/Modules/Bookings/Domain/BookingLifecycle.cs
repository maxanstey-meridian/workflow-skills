using System.Diagnostics;

namespace RoomBooking.Api.Modules.Bookings.Domain;

public enum BookingAction
{
    Cancel,
    CheckIn,
}

public enum BookingRefusal
{
    NotActive,
    AlreadyCheckedIn,
    CheckInNotOpen,
    CheckInWindowClosed,
    AlreadyEnded,
}

public readonly record struct BookingSnapshot(
    BookingStatus Status,
    DateTimeOffset Start,
    DateTimeOffset End
);

/// <summary>
///     The one pure decider for the booking lifecycle: it guards every use case and projects
///     <c>availableActions</c> onto the read model, so no caller re-derives the rule. It explains;
///     the database's overlap constraint arbitrates the races.
/// </summary>
public static class BookingLifecycle
{
    /// <summary>Why the action cannot happen now, or null when it can.</summary>
    public static BookingRefusal? Refusal(
        BookingSnapshot booking,
        BookingAction action,
        DateTimeOffset now
    )
    {
        if (booking.Status is not (BookingStatus.Booked or BookingStatus.CheckedIn))
        {
            return BookingRefusal.NotActive;
        }

        switch (action)
        {
            case BookingAction.Cancel:
                return now >= booking.End ? BookingRefusal.AlreadyEnded : null;
            case BookingAction.CheckIn:
                if (booking.Status == BookingStatus.CheckedIn)
                {
                    return BookingRefusal.AlreadyCheckedIn;
                }

                if (now < booking.Start)
                {
                    return BookingRefusal.CheckInNotOpen;
                }

                return now >= booking.Start + BookingRules.CheckInGrace
                    ? BookingRefusal.CheckInWindowClosed
                    : null;
            default:
                throw new UnreachableException($"Unhandled booking action '{action}'.");
        }
    }

    /// <summary>Every action the booking allows right now, in declaration order.</summary>
    public static IReadOnlyList<BookingAction> Available(
        BookingSnapshot booking,
        DateTimeOffset now
    )
    {
        return Enum.GetValues<BookingAction>()
            .Where(action => Refusal(booking, action, now) is null)
            .ToList();
    }
}
