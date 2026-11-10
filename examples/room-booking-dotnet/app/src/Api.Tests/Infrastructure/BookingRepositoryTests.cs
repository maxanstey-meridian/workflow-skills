using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Modules.Bookings.Infrastructure;
using Cowork.Api.Tests.TestSupport;
using static Cowork.Api.Modules.Bookings.Domain.BookingWindows;

namespace Cowork.Api.Tests.Infrastructure;

/// <summary>
/// The booking store's adapter tests run on PostgreSQL 17, the production engine. The
/// overlap invariant's boundary — the exclusion constraint — is what these tests prove:
/// the write itself decides, and an expected conflict comes back as the declared outcome.
/// </summary>
[Collection("postgres")]
public sealed class BookingRepositoryTests(PostgresFixture db) : IAsyncLifetime
{
    public Task InitializeAsync() => db.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    private static readonly DateTimeOffset Now = new(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task A_valid_booking_is_persisted()
    {
        var repository = CreateRepository();

        var booking = Booking.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Now.AddDays(1),
            Now.AddDays(1).AddHours(1)
        );
        var outcome = await repository.AddAsync(booking, CancellationToken.None);

        outcome.Should().Be(AddBookingOutcome.Added);
        (await repository.FindAsync(booking.Id, CancellationToken.None)).Should().NotBeNull();
    }

    [Fact]
    public async Task A_second_hold_on_the_same_room_at_overlapping_times_is_refused_by_the_write()
    {
        var roomId = Guid.NewGuid();
        var repository = CreateRepository();
        await repository.AddAsync(
            Booking.Create(roomId, Guid.NewGuid(), Now.AddDays(1), Now.AddDays(1).AddHours(2)),
            CancellationToken.None
        );

        var outcome = await repository.AddAsync(
            Booking.Create(
                roomId,
                Guid.NewGuid(),
                Now.AddDays(1).AddMinutes(30),
                Now.AddDays(1).AddMinutes(90)
            ),
            CancellationToken.None
        );

        outcome.Should().Be(AddBookingOutcome.RoomAlreadyHeld);
    }

    [Fact]
    public async Task An_adjacent_hold_is_allowed_because_neither_includes_its_end()
    {
        var roomId = Guid.NewGuid();
        var repository = CreateRepository();
        await repository.AddAsync(
            Booking.Create(roomId, Guid.NewGuid(), Now.AddDays(1), Now.AddDays(1).AddHours(1)),
            CancellationToken.None
        );

        var outcome = await repository.AddAsync(
            Booking.Create(
                roomId,
                Guid.NewGuid(),
                Now.AddDays(1).AddHours(1),
                Now.AddDays(1).AddHours(2)
            ),
            CancellationToken.None
        );

        outcome.Should().Be(AddBookingOutcome.Added);
    }

    [Fact]
    public async Task A_cancelled_booking_frees_the_room_for_a_new_hold()
    {
        var roomId = Guid.NewGuid();
        var repository = CreateRepository();
        var first = Booking.Create(
            roomId,
            Guid.NewGuid(),
            Now.AddDays(1),
            Now.AddDays(1).AddHours(1)
        );
        await repository.AddAsync(first, CancellationToken.None);
        first.Cancel(Now);
        await repository.SaveAsync(CancellationToken.None);

        var outcome = await repository.AddAsync(
            Booking.Create(roomId, Guid.NewGuid(), Now.AddDays(1), Now.AddDays(1).AddHours(1)),
            CancellationToken.None
        );

        outcome.Should().Be(AddBookingOutcome.Added);
    }

    /// <summary>
    /// The repository query is the SQL copy of the decider's release rule; this test holds
    /// the copy to the decider. Invariant: the sweep releases exactly the holds the
    /// decider says are releasable, and no others.
    /// </summary>
    [Fact]
    public async Task ListExpiredAsync_returns_exactly_the_bookings_the_decider_releases()
    {
        var roomId = Guid.NewGuid();
        var repository = CreateRepository();
        var graceExpired = Seed(
            repository,
            roomId,
            Now - ReleaseGraceAfterStart - TimeSpan.FromMinutes(1),
            BookingStatus.Booked
        );
        var withinGrace = Seed(
            repository,
            roomId,
            Now - ReleaseGraceAfterStart + TimeSpan.FromMinutes(1),
            BookingStatus.Booked
        );
        var longPastCheckedIn = Seed(
            repository,
            roomId,
            Now - TimeSpan.FromHours(3),
            BookingStatus.CheckedIn
        );
        var longPastCancelled = Seed(
            repository,
            roomId,
            Now - TimeSpan.FromHours(3),
            BookingStatus.Cancelled
        );
        var releasedAlready = Seed(
            repository,
            roomId,
            Now - TimeSpan.FromHours(3),
            BookingStatus.Released
        );

        var expired = await repository.ListExpiredAsync(Now, CancellationToken.None);

        expired.Select(booking => booking.Id).Should().BeEquivalentTo([graceExpired.Id]);
        expired
            .Should()
            .OnlyContain(
                booking => BookingDecider.IsReleasable(booking.State(), Now),
                "the sweep's SQL copy must agree with the decider"
            );
        withinGrace.Status.Should().Be(BookingStatus.Booked);
        longPastCheckedIn.Status.Should().Be(BookingStatus.CheckedIn);
        longPastCancelled.Status.Should().Be(BookingStatus.Cancelled);
        releasedAlready.Status.Should().Be(BookingStatus.Released);
    }

    [Fact]
    public async Task ListRemindableAsync_returns_booked_unreminded_future_bookings_only()
    {
        var roomId = Guid.NewGuid();
        var repository = CreateRepository();
        var future = Seed(repository, roomId, Now.AddDays(1), BookingStatus.Booked);
        var reminded = Seed(repository, roomId, Now.AddDays(1).AddHours(2), BookingStatus.Booked);
        reminded.MarkReminderSent(Now);
        await repository.SaveAsync(CancellationToken.None);
        var past = Seed(repository, roomId, Now.AddHours(-1), BookingStatus.Booked);
        Seed(repository, roomId, Now.AddDays(1).AddHours(3), BookingStatus.Cancelled);

        var remindable = await repository.ListRemindableAsync(Now, CancellationToken.None);

        remindable.Select(booking => booking.Id).Should().BeEquivalentTo([future.Id]);
        remindable.Should().NotContain(reminded);
        remindable.Should().NotContain(past);
    }

    [Fact]
    public async Task ListHoldsAsync_returns_only_holds_that_overlap_the_day()
    {
        var roomId = Guid.NewGuid();
        var repository = CreateRepository();
        var day = new DateTimeOffset(2026, 11, 11, 0, 0, 0, TimeSpan.Zero);
        await repository.AddAsync(
            Booking.Create(roomId, Guid.NewGuid(), day.AddHours(9), day.AddHours(10)),
            CancellationToken.None
        );
        await repository.AddAsync(
            Booking.Create(roomId, Guid.NewGuid(), day.AddHours(11), day.AddHours(12)),
            CancellationToken.None
        );
        await repository.AddAsync(
            Cancelled(Booking.Create(roomId, Guid.NewGuid(), day.AddHours(11), day.AddHours(12))),
            CancellationToken.None
        );
        await repository.AddAsync(
            Booking.Create(
                roomId,
                Guid.NewGuid(),
                day.AddDays(1).AddHours(9),
                day.AddDays(1).AddHours(10)
            ),
            CancellationToken.None
        );

        var holds = await repository.ListHoldsAsync(
            roomId,
            day,
            day.AddDays(1),
            CancellationToken.None
        );

        holds.Should().HaveCount(2);
        holds.Select(booking => booking.StartsAt).Should().BeInAscendingOrder();
    }

    private static Booking Cancelled(Booking booking)
    {
        booking.Cancel(Now);
        return booking;
    }

    private static Booking Seed(
        IBookingRepository repository,
        Guid roomId,
        DateTimeOffset startsAt,
        BookingStatus status
    )
    {
        var booking = Booking.Create(roomId, Guid.NewGuid(), startsAt, startsAt.AddHours(1));
        if (status == BookingStatus.CheckedIn)
        {
            booking.CheckIn(startsAt);
        }
        else if (status == BookingStatus.Cancelled)
        {
            booking.Cancel(startsAt.AddMinutes(-1));
        }
        else if (status == BookingStatus.Released)
        {
            booking.Release(Now);
        }
        repository.AddAsync(booking, CancellationToken.None).GetAwaiter().GetResult();
        return booking;
    }

    private PostgresBookingRepository CreateRepository() => new(db.CreateContext());
}
