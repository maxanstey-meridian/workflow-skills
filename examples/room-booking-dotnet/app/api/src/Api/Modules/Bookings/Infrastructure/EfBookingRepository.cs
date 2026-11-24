using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Cowork.Api.Modules.Bookings.Infrastructure;

public sealed class EfBookingRepository(CoworkDbContext db) : Application.Ports.BookingRepository
{
    public async Task<Application.Ports.SlotOutcome> AddAsync(
        Booking booking,
        CancellationToken cancellationToken
    )
    {
        try
        {
            db.Bookings.Add(booking);
            await db.SaveChangesAsync(cancellationToken);
            return Application.Ports.SlotOutcome.Added;
        }
        catch (DbUpdateException ex) when (IsOverlapRefusal(ex))
        {
            db.Entry(booking).State = EntityState.Detached;
            return Application.Ports.SlotOutcome.RoomAlreadyBooked;
        }
    }

    public async Task<Booking?> FindForMemberAsync(
        Guid bookingId,
        string memberEmail,
        CancellationToken cancellationToken
    ) =>
        await db.Bookings.FirstOrDefaultAsync(
            b => b.Id == bookingId && b.MemberEmail == memberEmail,
            cancellationToken
        );

    public async Task<IReadOnlyList<Booking>> ListForMemberAsync(
        string memberEmail,
        CancellationToken cancellationToken
    ) => await db.Bookings.Where(b => b.MemberEmail == memberEmail).ToListAsync(cancellationToken);

    public async Task<bool> TransitionAsync(
        Guid bookingId,
        BookingStatus from,
        BookingStatus to,
        CancellationToken cancellationToken
    ) =>
        await db
            .Bookings.Where(b => b.Id == bookingId && b.Status == from)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, to), cancellationToken) == 1;

    public async Task<int> ReleaseExpiredAsync(
        DateTimeOffset cutoff,
        CancellationToken cancellationToken
    ) =>
        await db
            .Bookings.Where(b => b.Status == BookingStatus.Booked && b.StartsAt <= cutoff)
            .ExecuteUpdateAsync(
                s => s.SetProperty(b => b.Status, BookingStatus.Released),
                cancellationToken
            );

    public async Task<IReadOnlyList<Booking>> ListReminderDueAsync(
        DateTimeOffset from,
        DateTimeOffset until,
        CancellationToken cancellationToken
    ) =>
        await db
            .Bookings.Where(b =>
                b.Status == BookingStatus.Booked
                && b.ReminderSentAt == null
                && b.StartsAt >= from
                && b.StartsAt < until
            )
            .OrderBy(b => b.StartsAt)
            .ToListAsync(cancellationToken);

    public async Task<bool> MarkReminderSentAsync(
        Guid bookingId,
        DateTimeOffset sentAt,
        CancellationToken cancellationToken
    ) =>
        await db
            .Bookings.Where(b => b.Id == bookingId && b.ReminderSentAt == null)
            .ExecuteUpdateAsync(
                s => s.SetProperty(b => b.ReminderSentAt, sentAt),
                cancellationToken
            ) == 1;

    public async Task<IReadOnlyList<Guid>> RoomIdsWithActiveBookingBetweenAsync(
        DateTimeOffset startsAt,
        DateTimeOffset endsAt,
        CancellationToken cancellationToken
    ) =>
        await db
            .Bookings.Where(b =>
                b.StartsAt < endsAt
                && b.EndsAt > startsAt
                && BookingStatuses.Active.Contains(b.Status)
            )
            .Select(b => b.RoomId)
            .Distinct()
            .ToListAsync(cancellationToken);

    /// <summary>Postgres raises 23P01 (exclusion_violation) when the bookings exclusion index refuses an insert.</summary>
    private static bool IsOverlapRefusal(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.ExclusionViolation };
}
