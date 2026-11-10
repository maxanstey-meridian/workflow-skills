namespace Cowork.Api.Modules.Bookings.Domain;

/// <summary>
/// A booking is one member's hold on one room for a time slot. Every state change goes
/// through the <see cref="BookingDecider"/>, so a booking can never enter a state the
/// rules refuse.
/// </summary>
public sealed class Booking
{
    public Guid Id { get; private set; }

    public Guid RoomId { get; private set; }

    public Guid MemberId { get; private set; }

    public DateTimeOffset StartsAt { get; private set; }

    public DateTimeOffset EndsAt { get; private set; }

    public BookingStatus Status { get; private set; }

    public DateTimeOffset? ReminderSentAt { get; private set; }

    private Booking() { }

    public static Booking Create(
        Guid roomId,
        Guid memberId,
        DateTimeOffset startsAt,
        DateTimeOffset endsAt
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            RoomId = roomId,
            MemberId = memberId,
            StartsAt = startsAt,
            EndsAt = endsAt,
            Status = BookingStatus.Booked,
        };

    public BookingState State() => new(Status, StartsAt, EndsAt);

    public BookingDecision Cancel(DateTimeOffset now) =>
        Decide(BookingDecider.DecideCancel(State(), now), BookingStatus.Cancelled);

    public BookingDecision CheckIn(DateTimeOffset now) =>
        Decide(BookingDecider.DecideCheckIn(State(), now), BookingStatus.CheckedIn);

    public BookingDecision Release(DateTimeOffset now) =>
        Decide(
            BookingDecider.IsReleasable(State(), now)
                ? BookingDecision.Allow()
                : BookingDecision.Refuse(
                    "booking_not_releasable",
                    "The booking is not past its release deadline."
                ),
            BookingStatus.Released
        );

    public void MarkReminderSent(DateTimeOffset now) => ReminderSentAt = now;

    private BookingDecision Decide(BookingDecision decision, BookingStatus nextStatus)
    {
        if (decision.Allowed)
        {
            Status = nextStatus;
        }

        return decision;
    }
}
