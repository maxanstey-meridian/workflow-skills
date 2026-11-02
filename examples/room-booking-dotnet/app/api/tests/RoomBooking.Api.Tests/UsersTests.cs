using System.Net;
using FluentAssertions;
using Xunit;

namespace RoomBooking.Api.Tests;

[Collection("Api")]
public sealed class UsersTests(ApiTestFixture fixture) : ApiTest(fixture)
{
    [Fact]
    public async Task A_member_sees_their_own_session()
    {
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);

        var response = await client.GetAsync("/api/session", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.ReadJsonAsync();
        var user = body.GetProperty("user");
        user.GetProperty("email").GetString().Should().Be(ActingAs.BenEmail);
        user.GetProperty("name").GetString().Should().Be("Ben Cohen");
        user.GetProperty("role").GetString().Should().Be("member");
        var capabilities = body.GetProperty("capabilities");
        capabilities.GetProperty("canBookRooms").GetBoolean().Should().BeTrue();
        capabilities.GetProperty("canManageRooms").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task A_staff_member_sees_their_own_session()
    {
        var client = Fixture.CreateClient().Staff();

        var response = await client.GetAsync("/api/session", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.ReadJsonAsync();
        var user = body.GetProperty("user");
        user.GetProperty("email").GetString().Should().Be(ActingAs.StaffEmail);
        user.GetProperty("name").GetString().Should().Be("Amara Okafor");
        user.GetProperty("role").GetString().Should().Be("staff");
        var capabilities = body.GetProperty("capabilities");
        capabilities.GetProperty("canManageRooms").GetBoolean().Should().BeTrue();
        capabilities.GetProperty("canBookRooms").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task The_user_list_shows_every_seeded_user_in_name_order()
    {
        var client = Fixture.CreateClient().Member(ActingAs.DanaEmail);

        var response = await client.GetAsync("/api/users", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.ReadJsonAsync();
        var users = body.GetProperty("users");
        users.GetArrayLength().Should().Be(3);
        users
            .EnumerateArray()
            .Select(user => user.GetProperty("name").GetString())
            .Should()
            .Equal("Amara Okafor", "Ben Cohen", "Dana Whitfield");
        users
            .EnumerateArray()
            .Select(user => user.GetProperty("role").GetString())
            .Should()
            .Equal("staff", "member", "member");
    }
}
