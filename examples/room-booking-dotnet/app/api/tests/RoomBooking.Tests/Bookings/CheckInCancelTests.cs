using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;
using RoomBooking.Api.Modules.Bookings.Application;
using RoomBooking.Api.Modules.Bookings.Domain;
using RoomBooking.Tests.Support;

namespace RoomBooking.Tests.Bookings;

[Collection("postgres")]
public sealed class CheckInCancelTests(PostgresFixture db)
{
    private static readonly DateTime SlotStart = new(2026, 11, 10, 9, 0, 0, DateTimeKind.Utc);

    private record Setup(Guid BookingId, FakeTimeProvider Clock);

    // The scene for each test: where the clock sits once the booking exists,
    // relative to the slot's start. All checks are deterministic scene times,
    // never sleeps.
    private static readonly DateTimeOffset BeforeStart = new(
        SlotStart.AddMinutes(-10),
        TimeSpan.Zero
    );
    private static readonly DateTimeOffset WithinWindow = new(
        SlotStart.AddMinutes(5),
        TimeSpan.Zero
    );
    private static readonly DateTimeOffset PastGrace = new(SlotStart.AddMinutes(16), TimeSpan.Zero);
    private static readonly DateTimeOffset HalfAnHourBefore = new(
        SlotStart.AddMinutes(-30),
        TimeSpan.Zero
    );

    private async Task<Setup> BookedSlotAsync(
        IServiceProvider services,
        FakeTimeProvider clock,
        DateTimeOffset runAt,
        bool checkIn = false
    )
    {
        // The test's clock starts before the slot; the scene time comes after booking.
        var added = await services
            .GetRequiredService<AddRoom>()
            .ExecuteAsync("Focus Room", 4, TestHost.Staff, CancellationToken.None);
        var booking = await services
            .GetRequiredService<BookRoom>()
            .ExecuteAsync(
                added.Value.RoomId,
                SlotStart,
                SlotStart.AddHours(1),
                TestHost.MemberMia,
                CancellationToken.None
            );
        Assert.True(booking.IsSuccess);
        clock.SetUtcNow(runAt);
        if (checkIn)
        {
            var checkedIn = await services
                .GetRequiredService<CheckInBooking>()
                .ExecuteAsync(booking.Value.Id, TestHost.MemberMia, CancellationToken.None);
            Assert.True(checkedIn.IsSuccess);
        }
        return new Setup(booking.Value.Id, clock);
    }

    [Fact]
    public async Task Check_in_inside_the_window_succeeds_and_ends_the_actions()
    {
        await db.ResetAsync();
        var clock = TestHost.Clock(new DateTimeOffset(SlotStart.AddHours(-2), TimeSpan.Zero));
        await TestHost.WithScope(
            db,
            clock,
            null,
            async services =>
            {
                var setup = await BookedSlotAsync(services, clock, runAt: WithinWindow);
                var result = await services
                    .GetRequiredService<CheckInBooking>()
                    .ExecuteAsync(setup.BookingId, TestHost.MemberMia, CancellationToken.None);

                Assert.True(result.IsSuccess);
                Assert.Equal(BookingStatus.CheckedIn, result.Value.Status);
                Assert.Empty(result.Value.AvailableActions);
                await BookingAssertions.AssertActiveBookingCount(db, 1);
            }
        );
    }

    [Fact]
    public async Task Check_in_before_the_start_is_refused_with_check_in_not_open()
    {
        await db.ResetAsync();
        var clock = TestHost.Clock(new DateTimeOffset(SlotStart.AddHours(-2), TimeSpan.Zero));
        await TestHost.WithScope(
            db,
            clock,
            null,
            async services =>
            {
                var setup = await BookedSlotAsync(services, clock, runAt: BeforeStart);
                var result = await services
                    .GetRequiredService<CheckInBooking>()
                    .ExecuteAsync(setup.BookingId, TestHost.MemberMia, CancellationToken.None);

                Assert.True(result.IsFailed);
                Assert.Equal("booking_check_in_not_open", result.SoleFailure().Code);
                Assert.Equal(409, result.SoleFailure().Status.HttpStatus());
            }
        );
    }

    [Fact]
    public async Task A_booking_missed_past_the_grace_is_released_by_the_sweep_and_check_in_is_refused()
    {
        await db.ResetAsync();
        var clock = TestHost.Clock(new DateTimeOffset(SlotStart.AddHours(-2), TimeSpan.Zero));
        await TestHost.WithScope(
            db,
            clock,
            null,
            async services =>
            {
                var setup = await BookedSlotAsync(services, clock, runAt: PastGrace);
                var released = await services
                    .GetRequiredService<ReleaseStaleBookings>()
                    .ExecuteAsync(setup.Clock.GetUtcNow().UtcDateTime, CancellationToken.None);
                Assert.Equal(1, released);

                var result = await services
                    .GetRequiredService<CheckInBooking>()
                    .ExecuteAsync(setup.BookingId, TestHost.MemberMia, CancellationToken.None);
                Assert.True(result.IsFailed);
                Assert.Equal("booking_released", result.SoleFailure().Code);
                await BookingAssertions.AssertActiveBookingCount(db, 0);
            }
        );
    }

    [Fact]
    public async Task Another_member_cannot_cancel_someone_elses_booking()
    {
        await db.ResetAsync();
        var clock = TestHost.Clock(new DateTimeOffset(SlotStart.AddHours(-2), TimeSpan.Zero));
        await TestHost.WithScope(
            db,
            clock,
            null,
            async services =>
            {
                var setup = await BookedSlotAsync(services, clock, runAt: HalfAnHourBefore);
                var result = await services
                    .GetRequiredService<CancelBooking>()
                    .ExecuteAsync(setup.BookingId, TestHost.MemberKai, CancellationToken.None);

                Assert.True(result.IsFailed);
                Assert.Equal("booking_not_yours", result.SoleFailure().Code);
                Assert.Equal(403, result.SoleFailure().Status.HttpStatus());
                await BookingAssertions.AssertActiveBookingCount(db, 1);
            }
        );
    }

    [Fact]
    public async Task Cancel_before_the_start_succeeds_and_cannot_be_repeated()
    {
        await db.ResetAsync();
        var clock = TestHost.Clock(new DateTimeOffset(SlotStart.AddHours(-2), TimeSpan.Zero));
        await TestHost.WithScope(
            db,
            clock,
            null,
            async services =>
            {
                var setup = await BookedSlotAsync(services, clock, runAt: HalfAnHourBefore);
                var first = await services
                    .GetRequiredService<CancelBooking>()
                    .ExecuteAsync(setup.BookingId, TestHost.MemberMia, CancellationToken.None);
                Assert.True(first.IsSuccess);
                Assert.Equal(BookingStatus.Cancelled, first.Value.Status);
                Assert.Empty(first.Value.AvailableActions);

                var second = await services
                    .GetRequiredService<CancelBooking>()
                    .ExecuteAsync(setup.BookingId, TestHost.MemberMia, CancellationToken.None);
                Assert.Equal("booking_cancelled", second.SoleFailure().Code);
            }
        );
    }

    [Fact]
    public async Task A_check_in_which_races_the_release_sweep_sees_the_release_decision()
    {
        await db.ResetAsync();
        // Interleaving: the check-in writes conditionally, the sweep has already
        // released the booking; the write changes nothing and the decider
        // explains why. No timing sleeps — the sweep runs first by construction.
        var clock = TestHost.Clock(new DateTimeOffset(SlotStart.AddHours(-2), TimeSpan.Zero));
        await TestHost.WithScope(
            db,
            clock,
            null,
            async services =>
            {
                var setup = await BookedSlotAsync(services, clock, runAt: PastGrace);
                await services
                    .GetRequiredService<ReleaseStaleBookings>()
                    .ExecuteAsync(setup.Clock.GetUtcNow().UtcDateTime, CancellationToken.None);

                var result = await services
                    .GetRequiredService<CheckInBooking>()
                    .ExecuteAsync(setup.BookingId, TestHost.MemberMia, CancellationToken.None);
                Assert.Equal("booking_released", result.SoleFailure().Code);
            }
        );
    }
}
