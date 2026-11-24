namespace Cowork.Api.Modules.Bookings.Domain;

/// <summary>
/// The one decider for what a member may do with a booking at a moment.
/// Use cases guard with <see cref="Refusal"/> and the read model answers the
/// UI with <see cref="Available"/>.
/// </summary>
public static class BookingLifecycle
{
    /// <summary>
    /// A booking not checked in within 15 minutes of its start is released;
    /// check-in therefore closes at the same moment.
    /// </summary>
    public static readonly TimeSpan CheckInWindow = TimeSpan.FromMinutes(15);

    public static BookingRefusal? Refusal(
        Booking booking,
        BookingAction action,
        DateTimeOffset now
    ) =>
        action switch
        {
            BookingAction.Cancel => booking.Status == BookingStatus.Booked
                ? null
                : BookingRefusal.AlreadySettled,
            BookingAction.CheckIn => CheckInRefusal(booking, now),
            _ => throw new InvalidOperationException($"Unhandled booking action {action}."),
        };

    public static IReadOnlyList<BookingAction> Available(Booking booking, DateTimeOffset now) =>
        [.. Enum.GetValues<BookingAction>().Where(a => Refusal(booking, a, now) is null)];

    private static BookingRefusal? CheckInRefusal(Booking booking, DateTimeOffset now) =>
        booking.Status != BookingStatus.Booked ? BookingRefusal.AlreadySettled
        : now < booking.StartsAt ? BookingRefusal.NotOpenYet
        : now > booking.StartsAt + CheckInWindow ? BookingRefusal.WindowClosed
        : null;
}
