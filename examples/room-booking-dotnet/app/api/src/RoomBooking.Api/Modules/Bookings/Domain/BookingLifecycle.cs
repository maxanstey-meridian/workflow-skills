using System.Diagnostics;

namespace RoomBooking.Api.Modules.Bookings.Domain;

public enum BookingStatus
{
    Booked,
    CheckedIn,
    Cancelled,
    Released,
}

public enum BookingAction
{
    CheckIn,
    Cancel,
}

/// <summary>The closed set of reasons a booking action may be refused.</summary>
public enum BookingRefusal
{
    Cancelled,
    Released,
    AlreadyCheckedIn,
    CheckInNotOpenYet,
    CheckInClosed,
    BookingHasStarted,
}

/// <summary>The booking facts the lifecycle decision reads. No I/O.</summary>
public readonly record struct BookingState(BookingStatus Status, DateTime StartUtc);

/// <summary>
/// The one decider for the booking lifecycle: several user actions (check in,
/// cancel) depend on the same small state set, and the answer is needed in use
/// cases and on the page. Pure: pass the state and the time in.
/// </summary>
public static class BookingLifecycle
{
    /// <summary>
    /// A booking not checked in within 15 minutes of its start is released.
    /// </summary>
    public static readonly TimeSpan CheckInGrace = TimeSpan.FromMinutes(15);

    public static BookingRefusal? Refusal(BookingState state, BookingAction action, DateTime now) =>
        state.Status switch
        {
            BookingStatus.Booked => action switch
            {
                BookingAction.CheckIn => CheckInWindow(state.StartUtc, now),
                BookingAction.Cancel => now < state.StartUtc
                    ? null
                    : BookingRefusal.BookingHasStarted,
                _ => throw new UnreachableException($"{action} has no rule for a booked booking"),
            },
            BookingStatus.CheckedIn => BookingRefusal.AlreadyCheckedIn,
            BookingStatus.Cancelled => BookingRefusal.Cancelled,
            BookingStatus.Released => BookingRefusal.Released,
            _ => throw new UnreachableException($"{state.Status} is not a booking status"),
        };

    public static IReadOnlyList<BookingAction> Available(BookingState state, DateTime now) =>
        [.. Enum.GetValues<BookingAction>().Where(a => Refusal(state, a, now) is null)];

    // Check-in opens at the slot's start and closes when the booking is released.
    private static BookingRefusal? CheckInWindow(DateTime startUtc, DateTime now) =>
        now < startUtc ? BookingRefusal.CheckInNotOpenYet
        : now <= startUtc + CheckInGrace ? null
        : BookingRefusal.CheckInClosed;
}
