using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Tests.TestSupport;

/// <summary>
/// In-memory implementation of the booking port with the same overlap and
/// conditional-write semantics the Postgres exclusion index gives the real
/// adapter, so use-case tests and the shared behaviour suite exercise both.
/// </summary>
public sealed class InMemoryBookingRepository : BookingRepository
{
    private readonly object _gate = new();
    private readonly List<Booking> _bookings = [];

    /// <summary>Simulates losing a concurrent transition race once.</summary>
    public bool FailNextTransition { get; set; }

    public IReadOnlyList<Booking> Bookings
    {
        get
        {
            lock (_gate)
            {
                return [.. _bookings];
            }
        }
    }

    public Task<SlotOutcome> AddAsync(Booking booking, CancellationToken cancellationToken)
    {
        lock (_gate)
        {
            var overlaps = _bookings.Any(b =>
                b.RoomId == booking.RoomId
                && BookingStatuses.Active.Contains(b.Status)
                && b.StartsAt < booking.EndsAt
                && booking.StartsAt < b.EndsAt
            );
            if (overlaps)
            {
                return Task.FromResult(SlotOutcome.RoomAlreadyBooked);
            }

            _bookings.Add(booking);
            return Task.FromResult(SlotOutcome.Added);
        }
    }

    public Task<Booking?> FindForMemberAsync(
        Guid bookingId,
        string memberEmail,
        CancellationToken cancellationToken
    )
    {
        lock (_gate)
        {
            return Task.FromResult(
                _bookings.FirstOrDefault(b => b.Id == bookingId && b.MemberEmail == memberEmail)
            );
        }
    }

    public Task<IReadOnlyList<Booking>> ListForMemberAsync(
        string memberEmail,
        CancellationToken cancellationToken
    )
    {
        lock (_gate)
        {
            return Task.FromResult<IReadOnlyList<Booking>>([
                .. _bookings.Where(b => b.MemberEmail == memberEmail),
            ]);
        }
    }

    public Task<bool> TransitionAsync(
        Guid bookingId,
        BookingStatus from,
        BookingStatus to,
        CancellationToken cancellationToken
    )
    {
        lock (_gate)
        {
            if (FailNextTransition)
            {
                FailNextTransition = false;
                return Task.FromResult(false);
            }

            var booking = _bookings.FirstOrDefault(b => b.Id == bookingId && b.Status == from);
            if (booking is null)
            {
                return Task.FromResult(false);
            }

            booking.Status = to;
            return Task.FromResult(true);
        }
    }

    public Task<int> ReleaseExpiredAsync(DateTimeOffset cutoff, CancellationToken cancellationToken)
    {
        lock (_gate)
        {
            var expired = _bookings
                .Where(b => b.Status == BookingStatus.Booked && b.StartsAt <= cutoff)
                .ToList();
            foreach (var booking in expired)
            {
                booking.Status = BookingStatus.Released;
            }

            return Task.FromResult(expired.Count);
        }
    }

    public Task<IReadOnlyList<Booking>> ListReminderDueAsync(
        DateTimeOffset from,
        DateTimeOffset until,
        CancellationToken cancellationToken
    )
    {
        lock (_gate)
        {
            return Task.FromResult<IReadOnlyList<Booking>>([
                .. _bookings
                    .Where(b =>
                        b.Status == BookingStatus.Booked
                        && b.ReminderSentAt == null
                        && b.StartsAt >= from
                        && b.StartsAt < until
                    )
                    .OrderBy(b => b.StartsAt),
            ]);
        }
    }

    public Task<bool> MarkReminderSentAsync(
        Guid bookingId,
        DateTimeOffset sentAt,
        CancellationToken cancellationToken
    )
    {
        lock (_gate)
        {
            var booking = _bookings.FirstOrDefault(b =>
                b.Id == bookingId && b.ReminderSentAt == null
            );
            if (booking is null)
            {
                return Task.FromResult(false);
            }

            booking.ReminderSentAt = sentAt;
            return Task.FromResult(true);
        }
    }

    public Task<IReadOnlyList<Guid>> RoomIdsWithActiveBookingBetweenAsync(
        DateTimeOffset startsAt,
        DateTimeOffset endsAt,
        CancellationToken cancellationToken
    )
    {
        lock (_gate)
        {
            return Task.FromResult<IReadOnlyList<Guid>>([
                .. _bookings
                    .Where(b =>
                        b.StartsAt < endsAt
                        && b.EndsAt > startsAt
                        && BookingStatuses.Active.Contains(b.Status)
                    )
                    .Select(b => b.RoomId)
                    .Distinct(),
            ]);
        }
    }
}
