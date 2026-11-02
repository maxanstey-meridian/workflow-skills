using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Host.Persistence;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure;

public sealed class BookingFinder(RoomBookingDbContext db) : IBookingFinder
{
    public async Task<IReadOnlyList<Booking>> ListForMemberAsync(
        Guid memberId,
        CancellationToken cancellationToken
    )
    {
        // No tracking: these rows are read-only.
        return await db
            .Bookings.AsNoTracking()
            .Where(booking => booking.MemberId == memberId)
            .OrderByDescending(booking => booking.Start)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Booking>> ListUnremindedActiveAsync(
        CancellationToken cancellationToken
    )
    {
        // Tracked on purpose: the reminders use case marks each one and saves through the same
        // context. Active means the lifecycle states that hold a room (see BookingStatus).
        return await db
            .Bookings.Where(booking =>
                (
                    booking.Status == BookingStatus.Booked
                    || booking.Status == BookingStatus.CheckedIn
                )
                && booking.ReminderSentAt == null
            )
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Booking>> ListActiveOverlappingAsync(
        Guid roomId,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken
    )
    {
        return await db
            .Bookings.AsNoTracking()
            .Where(booking =>
                booking.RoomId == roomId
                && (
                    booking.Status == BookingStatus.Booked
                    || booking.Status == BookingStatus.CheckedIn
                )
                && booking.Start < to
                && booking.HeldUntil > from
            )
            .OrderBy(booking => booking.Start)
            .ToListAsync(cancellationToken);
    }
}
