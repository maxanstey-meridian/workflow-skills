using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace RoomBooking.Api.Tests;

[Collection("Api")]
public sealed class RoomsTests(ApiTestFixture fixture) : ApiTest(fixture)
{
    private const string RoomsUrl = "/api/rooms";

    [Fact]
    public async Task Staff_adding_a_room_returns_201_with_the_room()
    {
        var client = Fixture.CreateClient().Staff();

        var response = await client.PostAsJsonAsync(
            RoomsUrl,
            new { name = "Quiet Nook", capacity = 6 },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.ReadJsonAsync();
        body.GetProperty("id").GetString().Should().NotBeEmpty();
        body.GetProperty("name").GetString().Should().Be("Quiet Nook");
        body.GetProperty("capacity").GetInt32().Should().Be(6);
    }

    [Fact]
    public async Task A_member_cannot_add_rooms()
    {
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);

        var response = await client.PostAsJsonAsync(
            RoomsUrl,
            new { name = "Quiet Nook", capacity = 6 },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task A_room_name_that_is_already_taken_is_refused()
    {
        var client = Fixture.CreateClient().Staff();

        var response = await client.PostAsJsonAsync(
            RoomsUrl,
            new { name = "Willow Room", capacity = 3 },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("ROOM_NAME_TAKEN");
    }

    [Fact]
    public async Task Room_names_are_trimmed_before_they_are_stored()
    {
        var client = Fixture.CreateClient().Staff();

        var created = await client.PostAsJsonAsync(
            RoomsUrl,
            new { name = "  Quiet Nook  ", capacity = 5 },
            TestContext.Current.CancellationToken
        );

        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await created.ReadJsonAsync();
        body.GetProperty("name").GetString().Should().Be("Quiet Nook");

        var sameNameWithoutTrimming = await client.PostAsJsonAsync(
            RoomsUrl,
            new { name = "Quiet Nook ", capacity = 5 },
            TestContext.Current.CancellationToken
        );

        sameNameWithoutTrimming.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var refusal = await sameNameWithoutTrimming.ReadJsonAsync();
        refusal.GetProperty("code").GetString().Should().Be("ROOM_NAME_TAKEN");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(501)]
    public async Task A_room_must_hold_between_one_and_five_hundred_people(int capacity)
    {
        var client = Fixture.CreateClient().Staff();

        var response = await client.PostAsJsonAsync(
            RoomsUrl,
            new { name = "Quiet Nook", capacity },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("VALIDATION_FAILED");
        body.GetProperty("errors").GetProperty("capacity").EnumerateArray().Should().NotBeEmpty();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task A_room_needs_a_name(string name)
    {
        var client = Fixture.CreateClient().Staff();

        var response = await client.PostAsJsonAsync(
            RoomsUrl,
            new { name, capacity = 6 },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var body = await response.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("VALIDATION_FAILED");
        body.GetProperty("errors").GetProperty("name").EnumerateArray().Should().NotBeEmpty();
    }

    [Fact]
    public async Task A_room_name_may_be_at_most_100_characters()
    {
        var client = Fixture.CreateClient().Staff();

        var longestAllowed = await client.PostAsJsonAsync(
            RoomsUrl,
            new { name = new string('A', 100), capacity = 6 },
            TestContext.Current.CancellationToken
        );

        longestAllowed.StatusCode.Should().Be(HttpStatusCode.Created);

        var oneTooMany = await client.PostAsJsonAsync(
            RoomsUrl,
            new { name = new string('B', 101), capacity = 6 },
            TestContext.Current.CancellationToken
        );

        oneTooMany.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var body = await oneTooMany.ReadJsonAsync();
        body.GetProperty("code").GetString().Should().Be("VALIDATION_FAILED");
    }

    [Fact]
    public async Task The_room_list_shows_the_seeded_rooms_by_name()
    {
        var client = Fixture.CreateClient().Staff();

        var response = await client.GetAsync(RoomsUrl, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.ReadJsonAsync();
        var rooms = body.GetProperty("rooms");
        rooms.GetArrayLength().Should().Be(3);
        rooms
            .EnumerateArray()
            .Select(room => room.GetProperty("name").GetString())
            .Should()
            .Equal("Alder Room", "Oak Booth", "Willow Room");
        rooms
            .EnumerateArray()
            .Select(room => room.GetProperty("capacity").GetInt32())
            .Should()
            .Equal(4, 2, 8);
    }

    [Fact]
    public async Task The_room_list_shows_rooms_staff_added()
    {
        var client = Fixture.CreateClient().Staff();
        await client.PostAsJsonAsync(
            RoomsUrl,
            new { name = "Quiet Nook", capacity = 6 },
            TestContext.Current.CancellationToken
        );

        var response = await client.GetAsync(RoomsUrl, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.ReadJsonAsync();
        var rooms = body.GetProperty("rooms");
        rooms.GetArrayLength().Should().Be(4);
        rooms
            .EnumerateArray()
            .Select(room => room.GetProperty("name").GetString())
            .Should()
            .Contain("Quiet Nook");
    }
}
