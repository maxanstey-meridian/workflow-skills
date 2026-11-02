using Microsoft.EntityFrameworkCore;
using Npgsql;
using RoomBooking.Api.Host.Persistence;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure;

public sealed class BookingRepository(RoomBookingDbContext db) : IBookingRepository
{
    public async Task<Booking?> FindAsync(Guid id, CancellationToken cancellationToken)
    {
        // Tracked: the use cases transition the loaded booking and save it.
        return await db.Bookings.SingleOrDefaultAsync(
            booking => booking.Id == id,
            cancellationToken
        );
    }

    public async Task AddAsync(Booking booking, CancellationToken cancellationToken)
    {
        db.Bookings.Add(booking);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (exception.InnerException
                    is PostgresException { SqlState: PostgresErrorCodes.ExclusionViolation }
            )
        {
            throw new BookingConflictException(exception);
        }
    }

    public async Task<int> SaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            // This write lost the race; discard it so the next load sees the winner's state.
            foreach (var entry in exception.Entries)
            {
                entry.State = EntityState.Detached;
            }

            throw new BookingStaleException(exception);
        }
        catch (DbUpdateException exception)
            when (exception.InnerException
                    is PostgresException { SqlState: PostgresErrorCodes.ExclusionViolation }
            )
        {
            throw new BookingConflictException(exception);
        }
    }

    public async Task<int> ReleaseDueAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        // One atomic conditional UPDATE: the sweep cannot partially release, and it bypasses
        // change tracking by design. status 4 is BookingStatus.Released (pinned by the migration).
        return await db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE bookings SET status = 4 WHERE status = 1 AND held_until <= {now}",
            cancellationToken
        );
    }
}
