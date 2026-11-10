using Cowork.Api.Infrastructure;
using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql;

namespace Cowork.Api.Modules.Bookings.Infrastructure;

public sealed class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.ToTable("bookings");
        builder.HasKey(booking => booking.Id);
        builder.Property(booking => booking.Id).ValueGeneratedNever();
        builder.Property(booking => booking.RoomId).HasColumnName("room_id");
        builder.Property(booking => booking.MemberId).HasColumnName("member_id");
        builder.Property(booking => booking.StartsAt).HasColumnName("starts_at");
        builder.Property(booking => booking.EndsAt).HasColumnName("ends_at");
        builder.Property(booking => booking.ReminderSentAt).HasColumnName("reminder_sent_at");
        builder
            .Property(booking => booking.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20);
        builder.HasIndex(booking => new { booking.RoomId, booking.StartsAt });
        builder.HasIndex(booking => new { booking.MemberId, booking.StartsAt });
    }
}

/// <summary>
/// The bookings store on PostgreSQL. The overlap invariant is decided here: the
/// bookings table carries a PostgreSQL exclusion constraint that refuses a second
/// hold on the same room at overlapping times, and an expected constraint conflict
/// is reported as the declared outcome, not as a failure.
/// </summary>
public sealed class PostgresBookingRepository(CoworkDbContext db) : IBookingRepository
{
    public async Task<AddBookingOutcome> AddAsync(
        Booking booking,
        CancellationToken cancellationToken
    )
    {
        try
        {
            db.Bookings.Add(booking);
            await db.SaveChangesAsync(cancellationToken);
            return AddBookingOutcome.Added;
        }
        catch (DbUpdateException exception)
            when (exception.InnerException
                    is PostgresException { SqlState: PostgresErrorCodes.ExclusionViolation }
            )
        {
            db.Entry(booking).State = EntityState.Detached;
            return AddBookingOutcome.RoomAlreadyHeld;
        }
    }

    public async Task<Booking?> FindAsync(Guid bookingId, CancellationToken cancellationToken) =>
        await db.Bookings.FirstOrDefaultAsync(
            booking => booking.Id == bookingId,
            cancellationToken
        );

    public async Task SaveAsync(CancellationToken cancellationToken) =>
        await db.SaveChangesAsync(cancellationToken);

    public async Task<IReadOnlyList<Booking>> ListForMemberAsync(
        Guid memberId,
        CancellationToken cancellationToken
    ) =>
        await db
            .Bookings.Where(booking => booking.MemberId == memberId)
            .OrderBy(booking => booking.StartsAt)
            .ToArrayAsync(cancellationToken);

    public async Task<IReadOnlyList<Booking>> ListHoldsAsync(
        Guid roomId,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken
    ) =>
        await db
            .Bookings.Where(booking =>
                booking.RoomId == roomId
                && booking.StartsAt < to
                && booking.EndsAt > from
                && (
                    booking.Status == BookingStatus.Booked
                    || booking.Status == BookingStatus.CheckedIn
                )
            )
            .OrderBy(booking => booking.StartsAt)
            .ToArrayAsync(cancellationToken);

    /// <summary>The SQL copy of <see cref="BookingDecider.IsReleasable"/>; pinned to the decider by a test.</summary>
    public async Task<IReadOnlyList<Booking>> ListExpiredAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        var releaseDeadline = now - BookingWindows.ReleaseGraceAfterStart;
        return await db
            .Bookings.Where(booking =>
                booking.Status == BookingStatus.Booked && booking.StartsAt < releaseDeadline
            )
            .ToArrayAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Booking>> ListRemindableAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken
    ) =>
        await db
            .Bookings.Where(booking =>
                booking.Status == BookingStatus.Booked
                && booking.ReminderSentAt == null
                && booking.StartsAt > now
            )
            .OrderBy(booking => booking.StartsAt)
            .ToArrayAsync(cancellationToken);
}
