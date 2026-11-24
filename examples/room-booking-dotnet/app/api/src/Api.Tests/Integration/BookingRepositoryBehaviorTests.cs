using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Tests.Integration;

/// <summary>
/// One behaviour suite for the booking port, run against the in-memory fake
/// and the real PostgreSQL adapter, so the fake cannot drift from the
/// adapter's overlap, transition, release, and reminder semantics.
/// </summary>
public abstract class BookingRepositoryBehaviorTests
{
    protected abstract Task<BookingRepository> CreateRepositoryAsync();

    private static readonly DateTimeOffset _start = new(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);

    private static Booking MakeBooking(
        string memberEmail = "member@cowork.test",
        Guid? roomId = null,
        DateTimeOffset? startsAt = null,
        TimeSpan? length = null
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            RoomId = roomId ?? Guid.NewGuid(),
            MemberEmail = memberEmail,
            StartsAt = startsAt ?? _start,
            EndsAt = (startsAt ?? _start).Add(length ?? TimeSpan.FromHours(1)),
            Status = BookingStatus.Booked,
            CreatedAt = _start.AddDays(-1),
        };

    [Fact]
    public async Task AddedBookingIsFoundForItsMember()
    {
        var repository = await CreateRepositoryAsync();
        var booking = MakeBooking();

        (await repository.AddAsync(booking, CancellationToken.None)).Should().Be(SlotOutcome.Added);

        var found = await repository.FindForMemberAsync(
            booking.Id,
            booking.MemberEmail,
            CancellationToken.None
        );
        found.Should().NotBeNull();
        found!.Status.Should().Be(BookingStatus.Booked);
        (
            await repository.FindForMemberAsync(
                booking.Id,
                "other@cowork.test",
                CancellationToken.None
            )
        )
            .Should()
            .BeNull();
    }

    [Fact]
    public async Task OverlappingActiveBookingOnTheSameRoomIsRefused()
    {
        var repository = await CreateRepositoryAsync();
        var room = Guid.NewGuid();
        (await repository.AddAsync(MakeBooking(roomId: room), CancellationToken.None))
            .Should()
            .Be(SlotOutcome.Added);

        var overlapping = await repository.AddAsync(
            MakeBooking(roomId: room, startsAt: _start.AddMinutes(30)),
            CancellationToken.None
        );

        overlapping.Should().Be(SlotOutcome.RoomAlreadyBooked);
    }

    [Fact]
    public async Task AdjacentSlotsDoNotOverlap()
    {
        var repository = await CreateRepositoryAsync();
        var room = Guid.NewGuid();
        (await repository.AddAsync(MakeBooking(roomId: room), CancellationToken.None))
            .Should()
            .Be(SlotOutcome.Added);

        var adjacent = await repository.AddAsync(
            MakeBooking(roomId: room, startsAt: _start.AddHours(1)),
            CancellationToken.None
        );

        adjacent.Should().Be(SlotOutcome.Added);
    }

    [Fact]
    public async Task CancelledBookingFreesTheSlot()
    {
        var repository = await CreateRepositoryAsync();
        var room = Guid.NewGuid();
        var booking = MakeBooking(roomId: room);
        (await repository.AddAsync(booking, CancellationToken.None)).Should().Be(SlotOutcome.Added);
        (
            await repository.TransitionAsync(
                booking.Id,
                BookingStatus.Booked,
                BookingStatus.Cancelled,
                CancellationToken.None
            )
        )
            .Should()
            .BeTrue();

        var rebooked = await repository.AddAsync(MakeBooking(roomId: room), CancellationToken.None);

        rebooked.Should().Be(SlotOutcome.Added);
    }

    [Fact]
    public async Task TransitionOnlyAppliesWhileTheBookingIsInTheExpectedStatus()
    {
        var repository = await CreateRepositoryAsync();
        var booking = MakeBooking();
        (await repository.AddAsync(booking, CancellationToken.None)).Should().Be(SlotOutcome.Added);

        (
            await repository.TransitionAsync(
                booking.Id,
                BookingStatus.Cancelled,
                BookingStatus.Released,
                CancellationToken.None
            )
        )
            .Should()
            .BeFalse();
        (
            await repository.TransitionAsync(
                booking.Id,
                BookingStatus.Booked,
                BookingStatus.CheckedIn,
                CancellationToken.None
            )
        )
            .Should()
            .BeTrue();
        (
            await repository.TransitionAsync(
                booking.Id,
                BookingStatus.Booked,
                BookingStatus.CheckedIn,
                CancellationToken.None
            )
        )
            .Should()
            .BeFalse();
    }

    [Fact]
    public async Task ReleaseExpiredOnlyMovesBookedBookingsStartingBeforeTheCutoff()
    {
        var repository = await CreateRepositoryAsync();
        var expired = MakeBooking(startsAt: _start.AddMinutes(-60));
        var insideWindow = MakeBooking(startsAt: _start.AddMinutes(-10));
        var checkedIn = MakeBooking(startsAt: _start.AddHours(-2));
        checkedIn.Status = BookingStatus.CheckedIn;
        foreach (var booking in new[] { expired, insideWindow, checkedIn })
        {
            (await repository.AddAsync(booking, CancellationToken.None))
                .Should()
                .Be(SlotOutcome.Added);
        }

        var released = await repository.ReleaseExpiredAsync(
            _start - BookingLifecycle.CheckInWindow,
            CancellationToken.None
        );

        released.Should().Be(1);
        // A fresh reader, as a later request would see the rows.
        var reader = await CreateRepositoryAsync();
        (await reader.FindForMemberAsync(expired.Id, expired.MemberEmail, CancellationToken.None))!
            .Status.Should()
            .Be(BookingStatus.Released);
        (
            await reader.FindForMemberAsync(
                insideWindow.Id,
                insideWindow.MemberEmail,
                CancellationToken.None
            )
        )!
            .Status.Should()
            .Be(BookingStatus.Booked);
        (
            await reader.FindForMemberAsync(
                checkedIn.Id,
                checkedIn.MemberEmail,
                CancellationToken.None
            )
        )!
            .Status.Should()
            .Be(BookingStatus.CheckedIn);
    }

    [Fact]
    public async Task ReminderDueListsOnlyUnremindedBookedBookingsInTheWindow()
    {
        var repository = await CreateRepositoryAsync();
        var due = MakeBooking(startsAt: _start);
        var reminded = MakeBooking(
            memberEmail: "reminded@cowork.test",
            startsAt: _start.AddHours(2)
        );
        reminded.ReminderSentAt = _start.AddHours(-5);
        var cancelled = MakeBooking(
            memberEmail: "cancelled@cowork.test",
            startsAt: _start.AddHours(3)
        );
        cancelled.Status = BookingStatus.Cancelled;
        var outside = MakeBooking(memberEmail: "outside@cowork.test", startsAt: _start.AddDays(2));
        foreach (var booking in new[] { due, reminded, cancelled, outside })
        {
            (await repository.AddAsync(booking, CancellationToken.None))
                .Should()
                .Be(SlotOutcome.Added);
        }

        var listed = await repository.ListReminderDueAsync(
            _start,
            _start.AddDays(1),
            CancellationToken.None
        );

        listed.Select(b => b.Id).Should().BeEquivalentTo([due.Id]);
    }

    [Fact]
    public async Task MarkReminderSentHappensOnce()
    {
        var repository = await CreateRepositoryAsync();
        var booking = MakeBooking();
        (await repository.AddAsync(booking, CancellationToken.None)).Should().Be(SlotOutcome.Added);

        (await repository.MarkReminderSentAsync(booking.Id, _start, CancellationToken.None))
            .Should()
            .BeTrue();
        (await repository.MarkReminderSentAsync(booking.Id, _start, CancellationToken.None))
            .Should()
            .BeFalse();
    }

    [Fact]
    public async Task ActiveBookingsHoldTheirRoomForOverlappingQueries()
    {
        var repository = await CreateRepositoryAsync();
        var room = Guid.NewGuid();
        (await repository.AddAsync(MakeBooking(roomId: room), CancellationToken.None))
            .Should()
            .Be(SlotOutcome.Added);

        var overlapping = await repository.RoomIdsWithActiveBookingBetweenAsync(
            _start.AddMinutes(-30),
            _start.AddMinutes(30),
            CancellationToken.None
        );
        var disjoint = await repository.RoomIdsWithActiveBookingBetweenAsync(
            _start.AddHours(2),
            _start.AddHours(3),
            CancellationToken.None
        );

        overlapping.Should().BeEquivalentTo([room]);
        disjoint.Should().BeEmpty();
    }
}
