using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Modules.Bookings.Application.Ports;

public enum SlotOutcome
{
    Added,

    /// <summary>The room's exclusion index refused the insert: an active booking overlaps the slot.</summary>
    RoomAlreadyBooked,
}

public interface BookingRepository
{
    /// <summary>Inserts the booking; the database's exclusion constraint decides, not a prior check.</summary>
    public Task<SlotOutcome> AddAsync(Booking booking, CancellationToken cancellationToken);

    public Task<Booking?> FindForMemberAsync(
        Guid bookingId,
        string memberEmail,
        CancellationToken cancellationToken
    );

    public Task<IReadOnlyList<Booking>> ListForMemberAsync(
        string memberEmail,
        CancellationToken cancellationToken
    );

    /// <summary>Conditional write: transitions the booking only while it is still in <paramref name="from"/>.</summary>
    public Task<bool> TransitionAsync(
        Guid bookingId,
        BookingStatus from,
        BookingStatus to,
        CancellationToken cancellationToken
    );

    /// <summary>Releases every booked booking starting at or before <paramref name="cutoff"/>. Idempotent.</summary>
    public Task<int> ReleaseExpiredAsync(
        DateTimeOffset cutoff,
        CancellationToken cancellationToken
    );

    /// <summary>Booked bookings starting in [from, until) with no reminder sent yet.</summary>
    public Task<IReadOnlyList<Booking>> ListReminderDueAsync(
        DateTimeOffset from,
        DateTimeOffset until,
        CancellationToken cancellationToken
    );

    /// <summary>Conditional write: marks the reminder sent only if it is not already marked.</summary>
    public Task<bool> MarkReminderSentAsync(
        Guid bookingId,
        DateTimeOffset sentAt,
        CancellationToken cancellationToken
    );

    public Task<IReadOnlyList<Guid>> RoomIdsWithActiveBookingBetweenAsync(
        DateTimeOffset startsAt,
        DateTimeOffset endsAt,
        CancellationToken cancellationToken
    );
}
