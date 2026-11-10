using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Modules.Bookings.Application.Ports;

/// <summary>What became of an attempted hold on a room.</summary>
public enum AddBookingOutcome
{
    /// <summary>The booking was persisted; its hold on the room starts.</summary>
    Added,

    /// <summary>Another booking already holds the room at overlapping times.</summary>
    RoomAlreadyHeld,
}

public interface IBookingRepository
{
    /// <summary>
    /// Persists a new booking. The database's exclusion constraint decides whether the
    /// room is still free for the slot; this is the authoritative answer, not a pre-check.
    /// </summary>
    public Task<AddBookingOutcome> AddAsync(Booking booking, CancellationToken cancellationToken);

    public Task<Booking?> FindAsync(Guid bookingId, CancellationToken cancellationToken);

    /// <summary>Saves changes made to loaded bookings in this scope.</summary>
    public Task SaveAsync(CancellationToken cancellationToken);

    public Task<IReadOnlyList<Booking>> ListForMemberAsync(
        Guid memberId,
        CancellationToken cancellationToken
    );

    /// <summary>Booked bookings of one room that overlap the given instant range, holding the room.</summary>
    public Task<IReadOnlyList<Booking>> ListHoldsAsync(
        Guid roomId,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken
    );

    /// <summary>Booked bookings whose release grace has run out; the SQL copy of <see cref="BookingDecider.IsReleasable"/>.</summary>
    public Task<IReadOnlyList<Booking>> ListExpiredAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken
    );

    /// <summary>Booked bookings that have not been reminded yet and have not started.</summary>
    public Task<IReadOnlyList<Booking>> ListRemindableAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken
    );
}
