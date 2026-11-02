using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using RoomBooking.Api.Modules.Bookings.Application;
using RoomBooking.Api.Modules.Bookings.Infrastructure.Scheduling;
using RoomBooking.Api.Tests.Support;
using Xunit;

namespace RoomBooking.Api.Tests;

[Collection("Api")]
public sealed class BookingSweepsTests(ApiTestFixture fixture) : ApiTest(fixture)
{
    private const string BookingsUrl = "/api/bookings";

    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById(
        "Europe/London"
    );

    private static DateTimeOffset UtcAt(DateOnly date, TimeOnly time)
    {
        return TimeZoneInfo.ConvertTimeToUtc(date.ToDateTime(time), Zone);
    }

    private void ClockIs(DateOnly date, TimeOnly time)
    {
        Fixture.Factory.Time.SetUtcNow(UtcAt(date, time));
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

    private async Task<Guid> BookAsync(
        HttpClient client,
        Guid roomId,
        DateTimeOffset start,
        DateTimeOffset end
    )
    {
        var response = await client.PostAsJsonAsync(
            BookingsUrl,
            new
            {
                roomId,
                start,
                end,
            },
            TestContext.Current.CancellationToken
        );
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.ReadJsonAsync();
        return Guid.Parse(body.GetProperty("id").GetString()!);
    }

    private async Task<int> ReleaseNowAsync()
    {
        using var scope = Fixture.Factory.Services.CreateScope();
        var release = scope.ServiceProvider.GetRequiredService<ReleaseStaleBookingsUseCase>();
        return await release.ExecuteAsync(TestContext.Current.CancellationToken);
    }

    private async Task<string> StatusOfAsync(HttpClient client, Guid bookingId)
    {
        var mine = await client.GetAsync(
            $"{BookingsUrl}/mine",
            TestContext.Current.CancellationToken
        );
        var bookings = (await mine.ReadJsonAsync()).GetProperty("bookings");
        return bookings
            .EnumerateArray()
            .Single(booking => booking.GetProperty("id").GetString() == bookingId.ToString())
            .GetProperty("status")
            .GetString()!;
    }

    [Fact]
    public async Task The_release_sweep_lets_a_lapsed_hold_go_and_frees_the_slot()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var start = UtcAt(new(2026, 11, 2), new(10, 0));
        var end = UtcAt(new(2026, 11, 2), new(11, 0));
        var bookingId = await BookAsync(client, roomId, start, end);

        // One second before the hold lapses, nothing is released yet.
        ClockIs(new(2026, 11, 2), new(10, 14, 59));
        (await ReleaseNowAsync()).Should().Be(0);
        (await StatusOfAsync(client, bookingId)).Should().Be("booked");

        ClockIs(new(2026, 11, 2), new(10, 16));
        (await ReleaseNowAsync()).Should().Be(1);
        (await StatusOfAsync(client, bookingId)).Should().Be("released");

        // The released booking holds nothing: the availability read shows only the hold of a
        // fresh booking, and the room still takes new ones.
        await BookAsync(client, roomId, UtcAt(new(2026, 11, 2), new(10, 30)), end);
        var availability = await client.GetAsync(
            $"/api/rooms/{roomId}/availability?date=2026-11-02",
            TestContext.Current.CancellationToken
        );
        var busy = (await availability.ReadJsonAsync()).GetProperty("busy");
        busy.GetArrayLength().Should().Be(1);
        busy.EnumerateArray()
            .Single()
            .GetProperty("start")
            .GetDateTimeOffset()
            .Should()
            .Be(UtcAt(new(2026, 11, 2), new(10, 30)));
    }

    [Fact]
    public async Task A_checked_in_booking_is_never_released()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var bookingId = await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 11, 2), new(12, 0)),
            UtcAt(new(2026, 11, 2), new(13, 0))
        );
        ClockIs(new(2026, 11, 2), new(12, 5));
        var checkIn = await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/check-in",
            content: null,
            TestContext.Current.CancellationToken
        );
        checkIn.StatusCode.Should().Be(HttpStatusCode.OK);

        ClockIs(new(2026, 11, 2), new(13, 30));
        (await ReleaseNowAsync()).Should().Be(0);
        (await StatusOfAsync(client, bookingId)).Should().Be("checkedIn");
    }

    [Fact]
    public async Task The_reminder_sweep_sends_once_on_the_evening_before()
    {
        var emails = Fixture.Factory.Services.GetRequiredService<FakeEmailSender>();
        emails.Sent.Clear();
        ClockIs(new(2026, 6, 15), new(12, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 6, 16), new(14, 0)),
            UtcAt(new(2026, 6, 16), new(15, 0))
        );
        var sweeper = Fixture.Factory.Services.GetRequiredService<ReminderSweeper>();

        // 18:29 on the evening before: one minute early, nothing is sent.
        ClockIs(new(2026, 6, 15), new(18, 29));
        await sweeper.RunOnceAsync(TestContext.Current.CancellationToken);
        emails.Sent.Should().BeEmpty();

        // 18:31: exactly one email, to the member, naming the room.
        ClockIs(new(2026, 6, 15), new(18, 31));
        await sweeper.RunOnceAsync(TestContext.Current.CancellationToken);
        emails.Sent.Should().HaveCount(1);
        var reminder = emails.Sent.Single();
        reminder.To.Should().Be(ActingAs.BenEmail);
        reminder.Subject.Should().Contain("Willow Room");
        reminder.Body.Should().Contain("Willow Room");

        // Re-running must not duplicate it.
        await sweeper.RunOnceAsync(TestContext.Current.CancellationToken);
        emails.Sent.Should().HaveCount(1);
    }

    [Fact]
    public async Task A_cancelled_booking_gets_no_reminder()
    {
        var emails = Fixture.Factory.Services.GetRequiredService<FakeEmailSender>();
        emails.Sent.Clear();
        ClockIs(new(2026, 6, 15), new(12, 0));
        var client = Fixture.CreateClient().Member(ActingAs.DanaEmail);
        var roomId = await RoomIdAsync(client, "Alder Room");
        var bookingId = await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 6, 16), new(15, 0)),
            UtcAt(new(2026, 6, 16), new(16, 0))
        );
        var cancel = await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/cancel",
            content: null,
            TestContext.Current.CancellationToken
        );
        cancel.StatusCode.Should().Be(HttpStatusCode.OK);
        var sweeper = Fixture.Factory.Services.GetRequiredService<ReminderSweeper>();

        ClockIs(new(2026, 6, 15), new(18, 31));
        await sweeper.RunOnceAsync(TestContext.Current.CancellationToken);

        emails.Sent.Should().BeEmpty();
    }
}
