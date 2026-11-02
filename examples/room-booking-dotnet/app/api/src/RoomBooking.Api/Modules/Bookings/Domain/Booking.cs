namespace RoomBooking.Api.Modules.Bookings.Domain;

/// <summary>
///     A member's hold on a room for a time slot. The only mutations are the lifecycle
///     transitions below, and they are guard-free: <see cref="BookingLifecycle" /> decides
///     first, and the database's exclusion constraint arbitrates the overlap race.
/// </summary>
public sealed class Booking
{
    private Booking(
        Guid id,
        Guid roomId,
        Guid memberId,
        DateTimeOffset start,
        DateTimeOffset end,
        BookingStatus status,
        DateTimeOffset? checkInAt,
        DateTimeOffset? reminderSentAt,
        DateTimeOffset heldUntil,
        DateTimeOffset createdAt
    )
    {
        Id = id;
        RoomId = roomId;
        MemberId = memberId;
        Start = start;
        End = end;
        Status = status;
        CheckInAt = checkInAt;
        ReminderSentAt = reminderSentAt;
        HeldUntil = heldUntil;
        CreatedAt = createdAt;
    }

    public Guid Id { get; }

    public Guid RoomId { get; }

    public Guid MemberId { get; }

    public DateTimeOffset Start { get; }

    public DateTimeOffset End { get; }

    public BookingStatus Status { get; private set; }

    public DateTimeOffset? CheckInAt { get; private set; }

    public DateTimeOffset? ReminderSentAt { get; private set; }

    /// <summary>
    ///     The instant the room stops being held: the whole slot once checked in, otherwise
    ///     the earlier of the slot's end and the check-in grace after the start.
    /// </summary>
    public DateTimeOffset HeldUntil { get; private set; }

    public DateTimeOffset CreatedAt { get; }

    /// <summary>
    ///     Books the room. The hold lasts until the slot ends, but expires
    ///     <see cref="BookingRules.CheckInGrace" /> after the start unless the booking is checked in.
    /// </summary>
    public static Booking Reserve(
        Guid roomId,
        Guid memberId,
        DateTimeOffset start,
        DateTimeOffset end,
        DateTimeOffset createdAt
    )
    {
        var graceEndsAt = start + BookingRules.CheckInGrace;
        var heldUntil = end < graceEndsAt ? end : graceEndsAt;
        return new Booking(
            Guid.CreateVersion7(),
            roomId,
            memberId,
            start,
            end,
            BookingStatus.Booked,
            checkInAt: null,
            reminderSentAt: null,
            heldUntil,
            createdAt
        );
    }

    /// <summary>Claims the room for the whole slot. A rebooked tail makes the save conflict.</summary>
    public void CheckIn(DateTimeOffset at)
    {
        Status = BookingStatus.CheckedIn;
        CheckInAt = at;
        HeldUntil = End;
    }

    public void Cancel()
    {
        Status = BookingStatus.Cancelled;
    }

    public void MarkReminderSent(DateTimeOffset at)
    {
        ReminderSentAt = at;
    }

    public BookingSnapshot Snapshot()
    {
        return new BookingSnapshot(Status, Start, End);
    }
}
