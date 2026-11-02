using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RoomBooking.Api.Host.Persistence;
using RoomBooking.Api.Modules.Bookings.Domain;
using Xunit;

namespace RoomBooking.Api.Tests;

[Collection("Api")]
public sealed class BookingConcurrencyTests(ApiTestFixture fixture) : ApiTest(fixture)
{
    private const string BookingsUrl = "/api/bookings";

    private static readonly DateTimeOffset Day = new(2026, 11, 2, 9, 0, 0, TimeSpan.Zero);

    private void ClockIs(DateTimeOffset instant)
    {
        Fixture.Factory.Time.SetUtcNow(instant);
    }

    private async Task<Guid> RoomIdAsync(HttpClient client, string name)
    {
        var response = await client.GetAsync("/api/rooms", TestContext.Current.CancellationToken);
        var body = await response.ReadJsonAsync();
        return Guid.Parse(
            body.GetProperty("rooms")
                .EnumerateArray()
                .Single(room => room.GetProperty("name").GetString() == name)
                .GetProperty("id")
                .GetString()!
        );
    }

    [Fact]
    public async Task Two_overlapping_bookings_from_two_members_produce_one_winner()
    {
        ClockIs(Day);
        var ben = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var dana = Fixture.CreateClient().Member(ActingAs.DanaEmail);
        var roomId = await RoomIdAsync(ben, "Willow Room");
        var payload = new
        {
            roomId,
            start = Day.AddHours(1),
            end = Day.AddHours(2),
        };

        // Both requests wait on the same gate, then fire together; no sleeps.
        var gate = new TaskCompletionSource();
        var benRequest = Task.Run(async () =>
        {
            await gate.Task;
            return await ben.PostAsJsonAsync(
                BookingsUrl,
                payload,
                TestContext.Current.CancellationToken
            );
        });
        var danaRequest = Task.Run(async () =>
        {
            await gate.Task;
            return await dana.PostAsJsonAsync(
                BookingsUrl,
                payload,
                TestContext.Current.CancellationToken
            );
        });
        gate.SetResult();
        var responses = await Task.WhenAll(benRequest, danaRequest);

        responses.Count(response => response.StatusCode == HttpStatusCode.Created).Should().Be(1);
        responses.Count(response => response.StatusCode == HttpStatusCode.Conflict).Should().Be(1);
        var loser = responses.Single(response => response.StatusCode == HttpStatusCode.Conflict);
        ((await loser.ReadJsonAsync()).GetProperty("code").GetString())
            .Should()
            .Be("ROOM_ALREADY_BOOKED");

        // Exactly one active hold for the room, at the database.
        await using var connection = new NpgsqlConnection(Fixture.ConnectionString);
        await connection.OpenAsync(TestContext.Current.CancellationToken);
        await using var command = new NpgsqlCommand(
            "SELECT count(*) FROM bookings WHERE room_id = $1 AND status IN (1, 2)",
            connection
        );
        command.Parameters.AddWithValue(roomId);
        (await command.ExecuteScalarAsync(TestContext.Current.CancellationToken))!.Should().Be(1L);
    }

    [Fact]
    public async Task Two_overlapping_rows_are_refused_by_the_database()
    {
        ClockIs(Day);
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        Guid benId;
        Guid danaId;
        using (var scope = Fixture.Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RoomBookingDbContext>();
            benId = db.Users.Single(user => user.Email == ActingAs.BenEmail).Id;
            danaId = db.Users.Single(user => user.Email == ActingAs.DanaEmail).Id;
        }

        await using var connectionScope = Fixture.Factory.Services.CreateAsyncScope();
        var bookingDb = connectionScope.ServiceProvider.GetRequiredService<RoomBookingDbContext>();
        bookingDb.Bookings.Add(
            Booking.Reserve(roomId, benId, Day.AddHours(1), Day.AddHours(2), Day)
        );
        await bookingDb.SaveChangesAsync(TestContext.Current.CancellationToken);

        bookingDb.Bookings.Add(
            Booking.Reserve(
                roomId,
                danaId,
                Day.AddHours(1).AddMinutes(10),
                Day.AddHours(2).AddMinutes(30),
                Day
            )
        );
        var save = async () =>
            await bookingDb.SaveChangesAsync(TestContext.Current.CancellationToken);

        (await save.Should().ThrowAsync<DbUpdateException>())
            .And.InnerException.Should()
            .BeOfType<PostgresException>()
            .Which.SqlState.Should()
            .Be(PostgresErrorCodes.ExclusionViolation);
    }
}
