using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;
using RoomBooking.Api.Modules.Bookings.Application;
using RoomBooking.Tests.Support;

namespace RoomBooking.Tests.Rooms;

[Collection("postgres")]
public sealed class RoomTests(PostgresFixture db)
{
    private static readonly FakeTimeProvider Clock = TestHost.Clock(
        new DateTimeOffset(2026, 11, 10, 8, 0, 0, TimeSpan.Zero)
    );
    private static readonly DateTime SlotStart = new(2026, 11, 11, 9, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task Staff_adds_a_room()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var result = await services
                    .GetRequiredService<AddRoom>()
                    .ExecuteAsync("Silent Booth", 1, TestHost.Staff, CancellationToken.None);
                Assert.True(result.IsSuccess);

                var rooms = await services
                    .GetRequiredService<ListRooms>()
                    .ExecuteAsync(CancellationToken.None);
                Assert.Contains(rooms.Rooms, r => r.Name == "Silent Booth" && r.Capacity == 1);
            }
        );
    }

    [Fact]
    public async Task A_member_cannot_add_a_room()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var result = await services
                    .GetRequiredService<AddRoom>()
                    .ExecuteAsync("Silent Booth", 1, TestHost.MemberMia, CancellationToken.None);
                Assert.True(result.IsFailed);
                Assert.Equal(403, result.SoleFailure().Status.HttpStatus());
            }
        );
    }

    [Fact]
    public async Task A_second_room_with_the_same_name_is_refused()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var first = await services
                    .GetRequiredService<AddRoom>()
                    .ExecuteAsync("Quiet Room", 4, TestHost.Staff, CancellationToken.None);
                Assert.True(first.IsSuccess);

                var second = await services
                    .GetRequiredService<AddRoom>()
                    .ExecuteAsync("Quiet Room", 2, TestHost.Staff, CancellationToken.None);
                Assert.Equal("room_name_taken", second.SoleFailure().Code);
                Assert.Equal(409, second.SoleFailure().Status.HttpStatus());
            }
        );
    }

    [Fact]
    public async Task Availability_marks_held_slots_taken_and_the_server_decides()
    {
        await db.ResetAsync();
        await TestHost.WithScope(
            db,
            Clock,
            null,
            async services =>
            {
                var added = await services
                    .GetRequiredService<AddRoom>()
                    .ExecuteAsync("Quiet Room", 4, TestHost.Staff, CancellationToken.None);
                var booked = await services
                    .GetRequiredService<BookRoom>()
                    .ExecuteAsync(
                        added.Value.RoomId,
                        SlotStart,
                        SlotStart.AddHours(2),
                        TestHost.MemberMia,
                        CancellationToken.None
                    );
                Assert.True(booked.IsSuccess);

                var availability = services.GetRequiredService<ListRoomAvailability>();
                var inside = await availability.ExecuteAsync(
                    SlotStart.AddMinutes(30),
                    SlotStart.AddMinutes(90),
                    CancellationToken.None
                );
                Assert.True(
                    inside.Rooms.Single(r => r.RoomId == added.Value.RoomId).IsAvailable == false
                );

                var before = await availability.ExecuteAsync(
                    SlotStart.AddHours(-1),
                    SlotStart,
                    CancellationToken.None
                );
                Assert.True(before.Rooms.Single(r => r.RoomId == added.Value.RoomId).IsAvailable);

                var touching = await availability.ExecuteAsync(
                    SlotStart.AddHours(2),
                    SlotStart.AddHours(3),
                    CancellationToken.None
                );
                Assert.True(touching.Rooms.Single(r => r.RoomId == added.Value.RoomId).IsAvailable);
            }
        );
    }
}
