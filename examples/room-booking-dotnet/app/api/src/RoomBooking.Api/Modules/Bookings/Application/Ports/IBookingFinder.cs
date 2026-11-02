using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application.Ports;

/// <summary>
///     Read-only booking lookups the write side does not need, after Builder A's
///     <c>IRoomFinder</c> precedent: a narrow port, an EF implementation in module
///     Infrastructure, registered explicitly.
/// </summary>
public interface IBookingFinder
{
    /// <summary>The member's bookings, newest slot first.</summary>
    public Task<IReadOnlyList<Booking>> ListForMemberAsync(
        Guid memberId,
        CancellationToken cancellationToken
    );

    /// <summary>
    ///     Active bookings that have not had their reminder sent yet. Tracked on purpose: the
    ///     reminders use case marks each one and saves through the same context.
    /// </summary>
    public Task<IReadOnlyList<Booking>> ListUnremindedActiveAsync(
        CancellationToken cancellationToken
    );

    /// <summary>Active bookings whose hold overlaps the interval [from, to), earliest first.</summary>
    public Task<IReadOnlyList<Booking>> ListActiveOverlappingAsync(
        Guid roomId,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken
    );
}
