using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;
using RoomBooking.Api.Modules.Bookings.Application;
using RoomBooking.Api.Modules.Bookings.Domain;
using RoomBooking.Tests.Support;

namespace RoomBooking.Tests.Bookings;

[Collection("postgres")]
public sealed class BookRoomTests(PostgresFixture db)
{
    private static readonly DateTime Day = new(2026, 11, 10, 0, 0, 0, DateTimeKind.Utc);
    private static readonly FakeTimeProvider Clock = TestHost.Clock(
        new DateTimeOffset(2026, 11, 10, 8, 0, 0, TimeSpan.Zero)
    );

    private async Task<Guid> RoomAsync(IServiceProvider services, string name = "Focus Room")
    {
        var added = await services
            .GetRequiredService<AddRoom>()
            .ExecuteAsync(name, 4, TestHost.Staff, CancellationToken.None);
        return added.Value.RoomId;
    }

    [Fact]
    public async Task A_member_books_a_free_room()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var roomId = await RoomAsync(services);
                var booking = await services
                    .GetRequiredService<BookRoom>()
                    .ExecuteAsync(
                        roomId,
                        Day.AddHours(9),
                        Day.AddHours(10),
                        TestHost.MemberMia,
                        CancellationToken.None
                    );

                Assert.True(
                    booking.IsSuccess,
                    string.Join(";", booking.Errors.Select(e => e.Message))
                );
                Assert.Equal(BookingStatus.Booked, booking.Value.Status);
                Assert.Equal("Focus Room", booking.Value.RoomName);
                Assert.Equal([BookingAction.Cancel], booking.Value.AvailableActions);
                await BookingAssertions.AssertActiveBookingCount(db, 1);
            }
        );
    }

    [Fact]
    public async Task An_overlapping_booking_for_the_same_room_is_refused()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var roomId = await RoomAsync(services);
                var first = await services
                    .GetRequiredService<BookRoom>()
                    .ExecuteAsync(
                        roomId,
                        Day.AddHours(9),
                        Day.AddHours(10),
                        TestHost.MemberMia,
                        CancellationToken.None
                    );
                Assert.True(first.IsSuccess);

                var second = await services
                    .GetRequiredService<BookRoom>()
                    .ExecuteAsync(
                        roomId,
                        Day.AddHours(9.5),
                        Day.AddHours(11),
                        TestHost.MemberKai,
                        CancellationToken.None
                    );

                Assert.True(second.IsFailed);
                var failure = second.SoleFailure();
                Assert.Equal("booking_room_overlapped", failure.Code);
                await BookingAssertions.AssertActiveBookingCount(db, 1);
            }
        );
    }

    [Fact]
    public async Task Adjacent_half_open_slots_and_other_rooms_do_not_conflict()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var roomA = await RoomAsync(services, "Room A");
                var roomB = await RoomAsync(services, "Room B");

                var adjacent = await services
                    .GetRequiredService<BookRoom>()
                    .ExecuteAsync(
                        roomA,
                        Day.AddHours(10),
                        Day.AddHours(11),
                        TestHost.MemberMia,
                        CancellationToken.None
                    );
                Assert.True(
                    adjacent.IsSuccess,
                    "an adjacent slot starts exactly where the other ends"
                );

                var otherRoom = await services
                    .GetRequiredService<BookRoom>()
                    .ExecuteAsync(
                        roomB,
                        Day.AddHours(10),
                        Day.AddHours(11),
                        TestHost.MemberKai,
                        CancellationToken.None
                    );
                Assert.True(otherRoom.IsSuccess, "another room can hold the same slot");

                await BookingAssertions.AssertActiveBookingCount(db, 2);
            }
        );
    }

    [Fact]
    public async Task Concurrent_overlapping_bookings_leave_exactly_one_winner()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var roomId = await RoomAsync(services);
                var root = services.CreateScope().ServiceProvider;
                var attempt = (IServiceProvider inner, int _) =>
                    inner
                        .GetRequiredService<BookRoom>()
                        .ExecuteAsync(
                            roomId,
                            Day.AddHours(9),
                            Day.AddHours(10),
                            TestHost.MemberMia,
                            CancellationToken.None
                        );

                var results = await Task.WhenAll(
                    Enumerable
                        .Range(0, 8)
                        .Select(async i =>
                        {
                            await using var scope = services.CreateAsyncScope();
                            return await attempt(scope.ServiceProvider, i);
                        })
                );

                var succeeded = results.Where(r => r.IsSuccess).ToList();
                var refused = results.Where(r => r.IsFailed).ToList();
                Assert.Single(succeeded);
                Assert.Equal(7, refused.Count);
                Assert.All(
                    refused,
                    r => Assert.Equal("booking_room_overlapped", r.SoleFailure().Code)
                );
                await BookingAssertions.AssertActiveBookingCount(db, 1);
            }
        );
    }

    [Fact]
    public async Task A_slot_freed_by_cancellation_or_release_can_be_rebooked()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var roomId = await RoomAsync(services);
                var bookings = services.GetRequiredService<BookRoom>();
                var booking = await bookings.ExecuteAsync(
                    roomId,
                    Day.AddHours(9),
                    Day.AddHours(10),
                    TestHost.MemberMia,
                    CancellationToken.None
                );
                Assert.True(booking.IsSuccess);

                var cancelled = await services
                    .GetRequiredService<CancelBooking>()
                    .ExecuteAsync(booking.Value.Id, TestHost.MemberMia, CancellationToken.None);
                Assert.True(cancelled.IsSuccess);

                var rebook = await bookings.ExecuteAsync(
                    roomId,
                    Day.AddHours(9),
                    Day.AddHours(10),
                    TestHost.MemberKai,
                    CancellationToken.None
                );
                Assert.True(rebook.IsSuccess, "a cancelled booking no longer holds the room");
            }
        );
    }

    [Fact]
    public async Task Booking_in_the_past_or_with_inverted_times_is_refused()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var roomId = await RoomAsync(services);
                var bookings = services.GetRequiredService<BookRoom>();

                var past = await bookings.ExecuteAsync(
                    roomId,
                    Day.AddHours(6),
                    Day.AddHours(7),
                    TestHost.MemberMia,
                    CancellationToken.None
                );
                Assert.Equal("booking_start_in_past", past.SoleFailure().Code);

                var inverted = await bookings.ExecuteAsync(
                    roomId,
                    Day.AddHours(12),
                    Day.AddHours(11),
                    TestHost.MemberMia,
                    CancellationToken.None
                );
                Assert.Equal("booking_slot_inverted", inverted.SoleFailure().Code);
            }
        );
    }

    [Fact]
    public async Task Unknown_room_is_refused()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var booking = await services
                    .GetRequiredService<BookRoom>()
                    .ExecuteAsync(
                        Guid.NewGuid(),
                        Day.AddHours(9),
                        Day.AddHours(10),
                        TestHost.MemberMia,
                        CancellationToken.None
                    );
                Assert.Equal("room_not_found", booking.SoleFailure().Code);
            }
        );
    }
}
