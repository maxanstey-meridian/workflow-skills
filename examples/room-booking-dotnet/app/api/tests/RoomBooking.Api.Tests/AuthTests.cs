using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace RoomBooking.Api.Tests;

[Collection("Api")]
public sealed class AuthTests(ApiTestFixture fixture) : ApiTest(fixture)
{
    [Fact]
    public async Task A_request_without_a_user_is_unauthenticated()
    {
        var client = Fixture.CreateClient();

        var response = await client.GetAsync("/api/session", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task An_unknown_user_is_unauthenticated()
    {
        var client = Fixture.CreateClient().Member("stranger@roombooking.dev");

        var response = await client.GetAsync("/api/session", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_member_cannot_use_a_staff_endpoint()
    {
        var client = Fixture.CreateClient().Member(ActingAs.BenEmail);

        var response = await client.PostAsJsonAsync(
            "/api/rooms",
            new { name = "Quiet Nook", capacity = 6 },
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
