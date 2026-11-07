using Microsoft.EntityFrameworkCore;
using Npgsql;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;
using RoomBooking.Api.Persistence;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure;

public sealed class EfRoomRepository(BookingDbContext db) : IRoomRepository
{
    public async Task<RoomPersistOutcome> AddAsync(Room room, CancellationToken ct)
    {
        db.Rooms.Add(room);
        try
        {
            await db.SaveChangesAsync(ct);
            return RoomPersistOutcome.Persisted;
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is PostgresException p
                && p.SqlState == PostgresErrorCodes.UniqueViolation
            )
        {
            db.Entry(room).State = EntityState.Detached;
            return RoomPersistOutcome.NameTaken;
        }
    }
}

public sealed class EfBookingRepository(BookingDbContext db) : IBookingRepository
{
    public async Task<BookingPersistOutcome> AddAsync(Booking booking, CancellationToken ct)
    {
        db.Bookings.Add(booking);
        try
        {
            await db.SaveChangesAsync(ct);
            return BookingPersistOutcome.Persisted;
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is PostgresException p
                && p.SqlState
                    is PostgresErrorCodes.ExclusionViolation
                        or PostgresErrorCodes.ForeignKeyViolation
            )
        {
            db.Entry(booking).State = EntityState.Detached;
            return p.SqlState == PostgresErrorCodes.ExclusionViolation
                ? BookingPersistOutcome.RoomOverlapped
                : BookingPersistOutcome.RoomMissing;
        }
    }

    public Task<bool> TryCheckInAsync(Guid id, CancellationToken ct) =>
        TryTransitionAsync(id, BookingStatus.CheckedIn, ct);

    public Task<bool> TryCancelAsync(Guid id, CancellationToken ct) =>
        TryTransitionAsync(id, BookingStatus.Cancelled, ct);

    private async Task<bool> TryTransitionAsync(Guid id, BookingStatus to, CancellationToken ct)
    {
        // One atomic conditional write: the status is updated only from Booked.
        var rows = await db
            .Bookings.Where(b => b.Id == id && b.Status == BookingStatus.Booked)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, to), ct);
        return rows == 1;
    }

    public async Task<int> ReleaseStaleAsync(DateTime cutoff, CancellationToken ct)
    {
        return await db
            .Bookings.Where(b => b.Status == BookingStatus.Booked && b.StartUtc <= cutoff)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, BookingStatus.Released), ct);
    }

    public async Task<int> MarkReminderSentAsync(Guid id, DateTime sentAtUtc, CancellationToken ct)
    {
        return await db
            .Bookings.Where(b => b.Id == id && b.ReminderSentAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.ReminderSentAtUtc, sentAtUtc), ct);
    }
}
