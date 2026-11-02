using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application.Ports;

public interface IBookingRepository
{
    /// <summary>Loads the booking for a transition; tracked, so a later save persists it.</summary>
    public Task<Booking?> FindAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    ///     Adds and saves the booking. Throws <see cref="BookingConflictException" /> when the
    ///     room is already held for an overlapping time (Postgres exclusion violation 23P01).
    /// </summary>
    public Task AddAsync(Booking booking, CancellationToken cancellationToken);

    /// <summary>
    ///     Saves tracked transitions. Throws <see cref="BookingStaleException" /> when the booking
    ///     changed under this save (status concurrency token), and
    ///     <see cref="BookingConflictException" /> when the room's freed tail was rebooked (23P01).
    /// </summary>
    public Task<int> SaveAsync(CancellationToken cancellationToken);

    /// <summary>
    ///     Releases every Booked booking whose hold has lapsed, in one atomic UPDATE, and returns
    ///     how many rows it released.
    /// </summary>
    public Task<int> ReleaseDueAsync(DateTimeOffset now, CancellationToken cancellationToken);
}

/// <summary>Thrown by the repository adapter when the room's hold state conflicts (23P01).</summary>
public sealed class BookingConflictException(Exception innerException)
    : Exception("The room's hold state changed under this booking.", innerException);

/// <summary>
///     Thrown by the repository adapter when the booking changed before this save (the status
///     concurrency token). The write is discarded, so the next load sees the winner's state.
/// </summary>
public sealed class BookingStaleException(Exception innerException)
    : Exception("The booking changed before this change was saved.", innerException);
