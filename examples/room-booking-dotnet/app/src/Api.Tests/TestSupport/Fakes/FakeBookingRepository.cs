using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Tests.TestSupport.Fakes;

/// <summary>An in-memory booking store that behaves like the database's arbitration: an
/// overlap against an existing hold comes back as RoomAlreadyHeld.</summary>
public sealed class FakeBookingRepository : IBookingRepository
{
    private readonly List<Booking> bookings = [];

    public Task<AddBookingOutcome> AddAsync(Booking booking, CancellationToken cancellationToken)
    {
        if (HoldsRoom(booking))
        {
            return Task.FromResult(AddBookingOutcome.RoomAlreadyHeld);
        }

        bookings.Add(booking);
        return Task.FromResult(AddBookingOutcome.Added);
    }

    public Task<Booking?> FindAsync(Guid bookingId, CancellationToken cancellationToken) =>
        Task.FromResult(bookings.FirstOrDefault(booking => booking.Id == bookingId));

    public Task SaveAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task<IReadOnlyList<Booking>> ListForMemberAsync(
        Guid memberId,
        CancellationToken cancellationToken
    ) =>
        Task.FromResult<IReadOnlyList<Booking>>(
            bookings
                .Where(booking => booking.MemberId == memberId)
                .OrderBy(booking => booking.StartsAt)
                .ToArray()
        );

    public Task<IReadOnlyList<Booking>> ListHoldsAsync(
        Guid roomId,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken
    ) =>
        Task.FromResult<IReadOnlyList<Booking>>(
            bookings
                .Where(booking =>
                    booking.RoomId == roomId
                    && booking.StartsAt < to
                    && booking.EndsAt > from
                    && (
                        booking.Status == BookingStatus.Booked
                        || booking.Status == BookingStatus.CheckedIn
                    )
                )
                .ToArray()
        );

    public Task<IReadOnlyList<Booking>> ListExpiredAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        var releaseDeadline = now - BookingWindows.ReleaseGraceAfterStart;
        return Task.FromResult<IReadOnlyList<Booking>>(
            bookings
                .Where(booking =>
                    booking.Status == BookingStatus.Booked && booking.StartsAt < releaseDeadline
                )
                .ToArray()
        );
    }

    public Task<IReadOnlyList<Booking>> ListRemindableAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken
    ) =>
        Task.FromResult<IReadOnlyList<Booking>>(
            bookings
                .Where(booking =>
                    booking.Status == BookingStatus.Booked
                    && booking.ReminderSentAt == null
                    && booking.StartsAt > now
                )
                .ToArray()
        );

    public void Seed(params Booking[] seed) => bookings.AddRange(seed);

    private bool HoldsRoom(Booking candidate) =>
        bookings.Any(existing =>
            existing.RoomId == candidate.RoomId
            && existing.StartsAt < candidate.EndsAt
            && existing.EndsAt > candidate.StartsAt
            && (
                existing.Status == BookingStatus.Booked
                || existing.Status == BookingStatus.CheckedIn
            )
        );
}
