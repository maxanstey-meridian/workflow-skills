namespace RoomBooking.Api.Modules.Bookings.Domain;

/// <summary>
/// A held room slot: booked by a member, then checked in, cancelled, or
/// released. Whether the slot still holds the room is decided by
/// <see cref="BookingStatus"/>: only Booked and CheckedIn do.
/// </summary>
public sealed class Booking
{
    public Booking(
        Guid id,
        Guid roomId,
        Guid memberId,
        string memberEmail,
        DateTime startUtc,
        DateTime endUtc,
        DateTime createdAtUtc
    )
    {
        Id = id;
        RoomId = roomId;
        MemberId = memberId;
        MemberEmail = memberEmail;
        StartUtc = startUtc;
        EndUtc = endUtc;
        CreatedAtUtc = createdAtUtc;
    }

    public Guid Id { get; private init; }
    public Guid RoomId { get; private init; }

    /// <summary>Navigation for read projections; the FK is authoritative.</summary>
    public Room? Room { get; private set; }

    /// <summary>The member holds the booking; only they may act on it.</summary>
    public Guid MemberId { get; private init; }

    /// <summary>
    /// The member's address when the booking was made, so reminders can find
    /// their recipient without joining another module's data.
    /// </summary>
    public string MemberEmail { get; private init; }

    public DateTime StartUtc { get; private init; }
    public DateTime EndUtc { get; private init; }
    public DateTime CreatedAtUtc { get; private init; }

    public BookingStatus Status { get; private set; }
    public DateTime? ReminderSentAtUtc { get; private set; }

    public void MarkCheckedIn()
    {
        if (Status != BookingStatus.Booked)
        {
            throw new InvalidOperationException($"A {Status} booking cannot be checked in");
        }

        Status = BookingStatus.CheckedIn;
    }

    public void MarkCancelled()
    {
        if (Status != BookingStatus.Booked)
        {
            throw new InvalidOperationException($"A {Status} booking cannot be cancelled");
        }

        Status = BookingStatus.Cancelled;
    }
}
