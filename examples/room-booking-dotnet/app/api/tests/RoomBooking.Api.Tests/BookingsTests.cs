using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace RoomBooking.Api.Tests;

[Collection("Api")]
public sealed class BookingsTests(ApiTestFixture fixture) : ApiTest(fixture)
{
    private const string BookingsUrl = "/api/bookings";

    // The app's booking zone. Tests mirror its day arithmetic through the same IANA id.
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

    private async Task<HttpResponseMessage> TryBookAsync(HttpClient client, object payload)
    {
        return await client.PostAsJsonAsync(
            BookingsUrl,
            payload,
            TestContext.Current.CancellationToken
        );
    }

    [Fact]
    public async Task A_member_books_a_room_and_receives_the_booking()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var start = UtcAt(new(2026, 11, 2), new(10, 0));
        var end = UtcAt(new(2026, 11, 2), new(11, 0));

        var response = await TryBookAsync(
            client,
            new
            {
                roomId,
                start,
                end,
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.ReadJsonAsync();
        body.GetProperty("status").GetString().Should().Be("booked");
        body.GetProperty("roomName").GetString().Should().Be("Willow Room");
        body.GetProperty("start").GetDateTimeOffset().Should().Be(start);
        body.GetProperty("end").GetDateTimeOffset().Should().Be(end);
        body.GetProperty("checkInAt").ValueKind.Should().Be(JsonValueKind.Null);
        body.GetProperty("checkInClosesAt").GetDateTimeOffset().Should().Be(start.AddMinutes(15));
        body.GetProperty("availableActions")
            .EnumerateArray()
            .Select(action => action.GetString())
            .Should()
            .Equal("cancel");
    }

    [Fact]
    public async Task Only_members_can_book_rooms()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Staff();
        var roomId = await RoomIdAsync(client, "Willow Room");
        var start = UtcAt(new(2026, 11, 2), new(10, 0));
        var end = UtcAt(new(2026, 11, 2), new(11, 0));

        var response = await TryBookAsync(
            client,
            new
            {
                roomId,
                start,
                end,
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task A_booking_must_end_after_it_starts()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var start = UtcAt(new(2026, 11, 2), new(10, 0));

        var response = await TryBookAsync(
            client,
            new
            {
                roomId,
                start,
                end = start,
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("END_BEFORE_START");
    }

    [Fact]
    public async Task A_booking_must_start_in_the_future()
    {
        ClockIs(new(2026, 11, 2), new(10, 30));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var start = UtcAt(new(2026, 11, 2), new(10, 0));
        var end = UtcAt(new(2026, 11, 2), new(11, 0));

        var response = await TryBookAsync(
            client,
            new
            {
                roomId,
                start,
                end,
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("START_IN_PAST");
    }

    [Fact]
    public async Task A_booking_needs_an_existing_room()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var start = UtcAt(new(2026, 11, 2), new(10, 0));
        var end = UtcAt(new(2026, 11, 2), new(11, 0));

        var response = await TryBookAsync(
            client,
            new
            {
                roomId = Guid.NewGuid(),
                start,
                end,
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("UNKNOWN_ROOM");
    }

    [Fact]
    public async Task An_overlapping_booking_is_refused()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var start = UtcAt(new(2026, 11, 2), new(10, 0));
        var end = UtcAt(new(2026, 11, 2), new(11, 0));
        await BookAsync(client, roomId, start, end);

        // A booking made before the first one is checked in holds [10:10, 10:25), which
        // overlaps the first booking's hold [10:00, 10:15).
        var response = await TryBookAsync(
            client,
            new
            {
                roomId,
                start = start.AddMinutes(10),
                end = end.AddMinutes(30),
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("ROOM_ALREADY_BOOKED");
    }

    [Fact]
    public async Task A_member_cancels_their_own_booking()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var bookingId = await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 11, 2), new(10, 0)),
            UtcAt(new(2026, 11, 2), new(11, 0))
        );

        var response = await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/cancel",
            content: null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.ReadJsonAsync();
        body.GetProperty("status").GetString().Should().Be("cancelled");
        body.GetProperty("availableActions").EnumerateArray().Should().BeEmpty();
    }

    [Fact]
    public async Task A_booking_cannot_be_cancelled_twice()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var bookingId = await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 11, 2), new(10, 0)),
            UtcAt(new(2026, 11, 2), new(11, 0))
        );
        await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/cancel",
            content: null,
            TestContext.Current.CancellationToken
        );

        var second = await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/cancel",
            content: null,
            TestContext.Current.CancellationToken
        );

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await second.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("ALREADY_CANCELLED");
    }

    [Fact]
    public async Task Another_members_booking_cannot_be_cancelled()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var ben = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var dana = Fixture.CreateClient().Member(ActingAs.DanaEmail);
        var roomId = await RoomIdAsync(ben, "Willow Room");
        var bookingId = await BookAsync(
            ben,
            roomId,
            UtcAt(new(2026, 11, 2), new(10, 0)),
            UtcAt(new(2026, 11, 2), new(11, 0))
        );

        var response = await dana.PostAsync(
            $"{BookingsUrl}/{bookingId}/cancel",
            content: null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("FORBIDDEN");
    }

    [Fact]
    public async Task Cancelling_an_unknown_booking_is_not_found()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);

        var response = await client.PostAsync(
            $"{BookingsUrl}/{Guid.NewGuid()}/cancel",
            content: null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("BOOKING_NOT_FOUND");
    }

    [Fact]
    public async Task A_ended_booking_cannot_be_cancelled()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var bookingId = await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 11, 2), new(10, 0)),
            UtcAt(new(2026, 11, 2), new(11, 0))
        );
        ClockIs(new(2026, 11, 2), new(11, 1));

        var response = await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/cancel",
            content: null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("ALREADY_ENDED");
    }

    [Fact]
    public async Task Check_in_opens_when_the_booking_starts()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var bookingId = await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 11, 2), new(10, 0)),
            UtcAt(new(2026, 11, 2), new(11, 0))
        );

        var response = await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/check-in",
            content: null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("CHECK_IN_NOT_OPEN");
    }

    [Fact]
    public async Task A_member_checks_in_inside_the_window()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var bookingId = await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 11, 2), new(10, 0)),
            UtcAt(new(2026, 11, 2), new(11, 0))
        );
        ClockIs(new(2026, 11, 2), new(10, 5));

        var response = await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/check-in",
            content: null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.ReadJsonAsync();
        body.GetProperty("status").GetString().Should().Be("checkedIn");
        body.GetProperty("checkInAt")
            .GetDateTimeOffset()
            .Should()
            .Be(UtcAt(new(2026, 11, 2), new(10, 5)));
        body.GetProperty("checkInClosesAt").ValueKind.Should().Be(JsonValueKind.Null);
        body.GetProperty("availableActions")
            .EnumerateArray()
            .Select(action => action.GetString())
            .Should()
            .Equal("cancel");
    }

    [Fact]
    public async Task Check_in_closes_15_minutes_after_the_start()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var bookingId = await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 11, 2), new(10, 0)),
            UtcAt(new(2026, 11, 2), new(11, 0))
        );
        ClockIs(new(2026, 11, 2), new(10, 15));

        var response = await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/check-in",
            content: null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("CHECK_IN_WINDOW_CLOSED");
    }

    [Fact]
    public async Task A_booking_cannot_be_checked_in_twice()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var bookingId = await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 11, 2), new(10, 0)),
            UtcAt(new(2026, 11, 2), new(11, 0))
        );
        ClockIs(new(2026, 11, 2), new(10, 5));
        await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/check-in",
            content: null,
            TestContext.Current.CancellationToken
        );

        var second = await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/check-in",
            content: null,
            TestContext.Current.CancellationToken
        );

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await second.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("ALREADY_CHECKED_IN");
    }

    [Fact]
    public async Task A_check_in_that_would_overlap_a_rebooked_tail_is_refused()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var ben = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var dana = Fixture.CreateClient().Member(ActingAs.DanaEmail);
        var roomId = await RoomIdAsync(ben, "Willow Room");
        var benBooking = await BookAsync(
            ben,
            roomId,
            UtcAt(new(2026, 11, 2), new(10, 0)),
            UtcAt(new(2026, 11, 2), new(11, 0))
        );
        // The tail Ben has not checked in yet is free: Dana books it.
        await BookAsync(
            dana,
            roomId,
            UtcAt(new(2026, 11, 2), new(10, 16)),
            UtcAt(new(2026, 11, 2), new(10, 50))
        );
        ClockIs(new(2026, 11, 2), new(10, 14));

        var response = await ben.PostAsync(
            $"{BookingsUrl}/{benBooking}/check-in",
            content: null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("ROOM_NO_LONGER_HELD");
        // Ben's booking still holds what it held before the refused check-in.
        var mine = await ben.GetAsync($"{BookingsUrl}/mine", TestContext.Current.CancellationToken);
        var bookings = (await mine.ReadJsonAsync()).GetProperty("bookings");
        bookings
            .EnumerateArray()
            .Single(booking => booking.GetProperty("id").GetString() == benBooking.ToString())
            .GetProperty("status")
            .GetString()
            .Should()
            .Be("booked");
    }

    [Fact]
    public async Task My_bookings_lists_the_member_bookings_newest_first()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var willow = await RoomIdAsync(client, "Willow Room");
        var alder = await RoomIdAsync(client, "Alder Room");
        await BookAsync(
            client,
            willow,
            UtcAt(new(2026, 11, 2), new(10, 0)),
            UtcAt(new(2026, 11, 2), new(11, 0))
        );
        await BookAsync(
            client,
            alder,
            UtcAt(new(2026, 11, 2), new(9, 0)),
            UtcAt(new(2026, 11, 2), new(9, 30))
        );

        var response = await client.GetAsync(
            $"{BookingsUrl}/mine",
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var bookings = (await response.ReadJsonAsync()).GetProperty("bookings");
        bookings.GetArrayLength().Should().Be(2);
        var slots = bookings
            .EnumerateArray()
            .Select(booking =>
                (
                    Room: booking.GetProperty("roomName").GetString(),
                    Start: booking.GetProperty("start").GetDateTimeOffset()
                )
            )
            .ToList();
        slots.Select(slot => slot.Room).Should().Equal("Willow Room", "Alder Room");
        slots.Select(slot => slot.Start).Should().BeInDescendingOrder();
    }

    [Fact]
    public async Task Availability_shows_the_held_parts_of_a_room()
    {
        ClockIs(new(2026, 11, 2), new(9, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        var start = UtcAt(new(2026, 11, 2), new(10, 0));
        var end = UtcAt(new(2026, 11, 2), new(11, 0));
        var bookingId = await BookAsync(client, roomId, start, end);

        var busyIs = async (int expected) =>
        {
            var day = new DateOnly(2026, 11, 2);
            var response = await client.GetAsync(
                $"/api/rooms/{roomId}/availability?date={day:yyyy-MM-dd}",
                TestContext.Current.CancellationToken
            );
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.ReadJsonAsync();
            body.GetProperty("roomId").GetString().Should().Be(roomId.ToString());
            body.GetProperty("date").GetString().Should().Be("2026-11-02");
            var busy = body.GetProperty("busy");
            busy.GetArrayLength().Should().Be(expected);
            return busy;
        };

        var held = await busyIs(1);
        held.EnumerateArray().Single().GetProperty("start").GetDateTimeOffset().Should().Be(start);
        held.EnumerateArray()
            .Single()
            .GetProperty("end")
            .GetDateTimeOffset()
            .Should()
            .Be(start.AddMinutes(15));

        await client.PostAsync(
            $"{BookingsUrl}/{bookingId}/cancel",
            content: null,
            TestContext.Current.CancellationToken
        );
        (await busyIs(0)).EnumerateArray().Should().BeEmpty();

        // The cancelled hold is gone, so the same slot can be booked again.
        await BookAsync(client, roomId, start, end);
        (await busyIs(1)).EnumerateArray().Should().NotBeEmpty();
    }

    [Fact]
    public async Task Availability_follows_the_zone_day_boundary()
    {
        // A summer evening: the booking starts after local midnight, so it belongs to the
        // next zone-local day, not the UTC day it falls in.
        ClockIs(new(2026, 6, 15), new(20, 0));
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);
        var roomId = await RoomIdAsync(client, "Willow Room");
        await BookAsync(
            client,
            roomId,
            UtcAt(new(2026, 6, 16), new(0, 30)),
            UtcAt(new(2026, 6, 16), new(1, 30))
        );

        var nextDay = await client.GetAsync(
            $"/api/rooms/{roomId}/availability?date=2026-06-16",
            TestContext.Current.CancellationToken
        );
        ((await nextDay.ReadJsonAsync()).GetProperty("busy").GetArrayLength()).Should().Be(1);

        var previousDay = await client.GetAsync(
            $"/api/rooms/{roomId}/availability?date=2026-06-15",
            TestContext.Current.CancellationToken
        );
        ((await previousDay.ReadJsonAsync()).GetProperty("busy").GetArrayLength()).Should().Be(0);
    }
}
