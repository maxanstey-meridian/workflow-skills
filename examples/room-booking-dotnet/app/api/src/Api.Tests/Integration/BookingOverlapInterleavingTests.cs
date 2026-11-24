using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Persistence;
using Cowork.Api.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace Cowork.Api.Tests.Integration;

/// <summary>
/// The race proof for the app's core invariant, run against real PostgreSQL.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class BookingOverlapInterleavingTests(CoworkTestDatabase database)
{
    // Invariant: a room holds at most one active booking covering any instant.
    //
    // Breaking order, with no exclusion index: request A INSERTs a booking for
    // (room 1, 10:00-11:00); request B INSERTs a booking for (room 1,
    // 10:30-11:30). Neither write reads the other, so both commit and the room
    // is double-booked — last-writer-wins is the defect, not a fix.
    //
    // Why every smaller mechanism fails: a unique index on room_id forbids all
    // bookings, not just overlapping ones; an application-level check-then-
    // insert has the read/write interleaving above; a serializable transaction
    // would abort one writer but needs retry machinery and holds locks wider
    // than the slot; and a row lock cannot cover a future time range. The
    // partial GiST exclusion index arbitrates inside the INSERT itself, so no
    // check-then-write window exists; the refused insert returns 23P01, which
    // the adapter reads as a domain outcome.
    [Fact]
    public async Task ConcurrentOverlappingBookingsExactlyOneWins()
    {
        var roomId = await GivenRoomAsync();
        var start = new DateTimeOffset(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);

        var inserts = Enumerable
            .Range(0, 8)
            .Select(i => BookAsync(roomId, start, start.AddHours(1), $"member{i}@cowork.test"));

        var outcomes = await Task.WhenAll(inserts);

        outcomes.Count(o => o == SlotOutcome.Added).Should().Be(1);
        outcomes.Count(o => o == SlotOutcome.RoomAlreadyBooked).Should().Be(7);
        await AssertBookedRowsForSlot(roomId, expected: 1);
    }

    [Fact]
    public async Task ConcurrentAdjacentSlotsBothWin()
    {
        var roomId = await GivenRoomAsync();
        var start = new DateTimeOffset(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);

        var outcomes = await Task.WhenAll(
            BookAsync(roomId, start, start.AddHours(1), "a@cowork.test"),
            BookAsync(roomId, start.AddHours(1), start.AddHours(2), "b@cowork.test")
        );

        outcomes.Should().BeEquivalentTo([SlotOutcome.Added, SlotOutcome.Added]);
        await AssertBookedRowsForSlot(roomId, expected: 2);
    }

    private static Booking MakeBooking(
        Guid roomId,
        DateTimeOffset startsAt,
        DateTimeOffset endsAt,
        string memberEmail
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            RoomId = roomId,
            MemberEmail = memberEmail,
            StartsAt = startsAt,
            EndsAt = endsAt,
            Status = BookingStatus.Booked,
            CreatedAt = startsAt.AddDays(-1),
        };

    private async Task<SlotOutcome> BookAsync(
        Guid roomId,
        DateTimeOffset startsAt,
        DateTimeOffset endsAt,
        string memberEmail
    )
    {
        var repository = new Modules.Bookings.Infrastructure.EfBookingRepository(
            await NewDbContextAsync()
        );
        return await repository.AddAsync(
            MakeBooking(roomId, startsAt, endsAt, memberEmail),
            CancellationToken.None
        );
    }

    private async Task<Guid> GivenRoomAsync()
    {
        await using var db = await NewDbContextAsync();
        var roomId = Guid.NewGuid();
        db.Rooms.Add(
            new Modules.Rooms.Domain.Room
            {
                Id = roomId,
                Name = "Huddle",
                Capacity = 4,
            }
        );
        await db.SaveChangesAsync();
        return roomId;
    }

    private async Task<CoworkDbContext> NewDbContextAsync()
    {
        var options = new DbContextOptionsBuilder<CoworkDbContext>()
            .UseNpgsql(database.ConnectionString)
            .UseSnakeCaseNamingConvention()
            .Options;
        var db = new CoworkDbContext(options);
        await db.Database.OpenConnectionAsync();
        return db;
    }

    private async Task AssertBookedRowsForSlot(Guid roomId, int expected)
    {
        await using var db = await NewDbContextAsync();
        var rows = await db.Bookings.CountAsync(b => b.RoomId == roomId);
        rows.Should().Be(expected);
    }
}
