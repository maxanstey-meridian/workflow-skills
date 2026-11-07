using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;
using RoomBooking.Api.Persistence;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure;

public sealed class EfRoomQueries(BookingDbContext db) : IRoomQueries
{
    public async Task<IReadOnlyList<RoomRow>> ListAsync(CancellationToken ct) =>
        await db
            .Rooms.AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => new RoomRow(r.Id, r.Name, r.Capacity))
            .ToListAsync(ct);

    public Task<RoomRow?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db
            .Rooms.AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => new RoomRow(r.Id, r.Name, r.Capacity))
            .SingleOrDefaultAsync(ct);

    public async Task<IReadOnlyList<RoomAvailabilityRow>> ListForSlotAsync(
        DateTime startUtc,
        DateTime endUtc,
        CancellationToken ct
    ) =>
        await db
            .Rooms.AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => new RoomAvailabilityRow(
                r.Id,
                r.Name,
                r.Capacity,
                // Whether the slot is free is the server's decision, not the caller's.
                !db.Bookings.Any(b =>
                    b.RoomId == r.Id
                    && (b.Status == BookingStatus.Booked || b.Status == BookingStatus.CheckedIn)
                    && b.StartUtc < endUtc
                    && b.EndUtc > startUtc
                )
            ))
            .ToListAsync(ct);
}

public sealed class EfBookingQueries(BookingDbContext db) : IBookingQueries
{
    public Task<BookingRow?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db
            .Bookings.AsNoTracking()
            .Where(b => b.Id == id)
            .Select(Projection)
            .SingleOrDefaultAsync(ct);

    public async Task<IReadOnlyList<BookingRow>> ListForMemberAsync(
        Guid memberId,
        CancellationToken ct
    ) =>
        await db
            .Bookings.AsNoTracking()
            .Where(b => b.MemberId == memberId)
            .Select(Projection)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<BookingRow>> ListDueForReminderAsync(
        DateTime startUtc,
        DateTime endUtc,
        CancellationToken ct
    ) =>
        await db
            .Bookings.AsNoTracking()
            .Where(b =>
                b.Status == BookingStatus.Booked
                && b.ReminderSentAtUtc == null
                && b.StartUtc >= startUtc
                && b.StartUtc < endUtc
            )
            .Select(Projection)
            .ToListAsync(ct);

    private static readonly Expression<Func<Booking, BookingRow>> Projection = b => new BookingRow(
        b.Id,
        b.RoomId,
        b.Room!.Name,
        b.MemberId,
        b.MemberEmail,
        b.StartUtc,
        b.EndUtc,
        b.Status,
        b.ReminderSentAtUtc
    );
}
