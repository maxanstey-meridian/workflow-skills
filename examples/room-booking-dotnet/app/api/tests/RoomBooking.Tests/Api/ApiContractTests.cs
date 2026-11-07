using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using RoomBooking.Tests.Support;

namespace RoomBooking.Tests.Api;

[Collection("postgres")]
public sealed class ApiContractTests(PostgresFixture db)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private WebApplicationFactory<Program> Host()
    {
        var factory = new WebApplicationFactory<Program>();
        return factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:Db", db.ConnectionString);
            builder.UseSetting("Scheduling:Enabled", "false");
            builder.UseSetting("urls", "http://127.0.0.1:0");
        });
    }

    private static async Task<JsonElement> GetUsersAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/users");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        return body.GetProperty("users");
    }

    private (string MemberId, string StaffId) Identities(JsonElement users)
    {
        var staff = users.EnumerateArray().First(u => u.GetProperty("role").GetString() == "staff");
        var member = users
            .EnumerateArray()
            .First(u => u.GetProperty("role").GetString() == "member");
        return (member.GetProperty("id").GetString()!, staff.GetProperty("id").GetString()!);
    }

    [Fact]
    public async Task Users_are_public_rooms_and_actions_are_not()
    {
        await db.ResetAsync();
        using var host = Host();
        var client = host.CreateClient();

        var users = await GetUsersAsync(client);
        Assert.True(users.ValueKind == JsonValueKind.Array && users.GetArrayLength() > 0);

        var unauthenticated = await client.GetAsync("/api/rooms");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthenticated.StatusCode);
    }

    [Fact]
    public async Task A_member_cannot_add_a_room_but_staff_can()
    {
        await db.ResetAsync();
        using var host = Host();
        var client = host.CreateClient();
        var (memberId, staffId) = Identities(await GetUsersAsync(client));
        var room = new { name = "Focus Room", capacity = 4 };

        var asMember = await client.SendAsync(
            Bearer(memberId, JsonRequest(HttpMethod.Post, "/api/rooms", room))
        );
        Assert.Equal(HttpStatusCode.Forbidden, asMember.StatusCode);

        var asStaff = await client.SendAsync(
            Bearer(staffId, JsonRequest(HttpMethod.Post, "/api/rooms", room))
        );
        Assert.Equal(HttpStatusCode.Created, asStaff.StatusCode);
        var created = await asStaff.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("Focus Room", created.GetProperty("name").GetString());
    }

    [Fact]
    public async Task An_invalid_room_request_returns_the_error_envelope()
    {
        await db.ResetAsync();
        using var host = Host();
        var client = host.CreateClient();
        var (_, staffId) = Identities(await GetUsersAsync(client));

        var response = await client.SendAsync(
            Bearer(
                staffId,
                JsonRequest(HttpMethod.Post, "/api/rooms", new { name = "", capacity = 0 })
            )
        );
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("validation_failed", body.GetProperty("code").GetString());
        Assert.True(body.GetProperty("errors").EnumerateObject().Any());
    }

    [Fact]
    public async Task Overlapping_bookings_via_the_real_host_return_the_conflict_envelope()
    {
        await db.ResetAsync();
        using var host = Host();
        var client = host.CreateClient();
        var (memberId, staffId) = Identities(await GetUsersAsync(client));

        var room = await client.SendAsync(
            Bearer(
                staffId,
                JsonRequest(
                    HttpMethod.Post,
                    "/api/rooms",
                    new { name = "Overlap Test", capacity = 2 }
                )
            )
        );
        var roomId = (await room.Content.ReadFromJsonAsync<JsonElement>(Json))
            .GetProperty("id")
            .GetString();

        var slot = new
        {
            roomId,
            startUtc = DateTime.UtcNow.AddHours(24).ToString("O"),
            endUtc = DateTime.UtcNow.AddHours(25).ToString("O"),
        };
        var first = await client.SendAsync(
            Bearer(memberId, JsonRequest(HttpMethod.Post, "/api/bookings", slot))
        );
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var booking = await first.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("booked", booking.GetProperty("status").GetString());
        Assert.Contains(
            "cancel",
            booking.GetProperty("availableActions").EnumerateArray().Select(a => a.GetString())
        );

        var second = await client.SendAsync(
            Bearer(memberId, JsonRequest(HttpMethod.Post, "/api/bookings", slot))
        );
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        var error = await second.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("booking_room_overlapped", error.GetProperty("code").GetString());
        Assert.False(string.IsNullOrWhiteSpace(error.GetProperty("message").GetString()));
    }

    [Fact]
    public async Task A_member_cancels_their_booking_through_the_real_host()
    {
        await db.ResetAsync();
        using var host = Host();
        var client = host.CreateClient();
        var (memberId, staffId) = Identities(await GetUsersAsync(client));

        var room = await client.SendAsync(
            Bearer(
                staffId,
                JsonRequest(
                    HttpMethod.Post,
                    "/api/rooms",
                    new { name = "Cancel Test", capacity = 2 }
                )
            )
        );
        var roomId = (await room.Content.ReadFromJsonAsync<JsonElement>(Json))
            .GetProperty("id")
            .GetString();
        var slot = new
        {
            roomId,
            startUtc = DateTime.UtcNow.AddHours(48).ToString("O"),
            endUtc = DateTime.UtcNow.AddHours(49).ToString("O"),
        };
        var booked = await client.SendAsync(
            Bearer(memberId, JsonRequest(HttpMethod.Post, "/api/bookings", slot))
        );
        var bookingId = (await booked.Content.ReadFromJsonAsync<JsonElement>(Json))
            .GetProperty("id")
            .GetString();

        var bookings = await client.SendAsync(
            Bearer(memberId, JsonRequest(HttpMethod.Get, "/api/bookings", null))
        );
        Assert.Equal(HttpStatusCode.OK, bookings.StatusCode);

        var cancelled = await client.SendAsync(
            Bearer(
                memberId,
                new HttpRequestMessage(HttpMethod.Post, $"/api/bookings/{bookingId}/cancel")
            )
        );
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        var body = await cancelled.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("cancelled", body.GetProperty("status").GetString());
        Assert.Empty(body.GetProperty("availableActions").EnumerateArray());
    }

    private static HttpRequestMessage Bearer(string userId, HttpRequestMessage request)
    {
        request.Headers.Authorization = new("Bearer", userId);
        return request;
    }

    private static HttpRequestMessage JsonRequest(HttpMethod method, string url, object? payload)
    {
        var request = new HttpRequestMessage(method, url);
        if (payload is not null)
        {
            request.Content = JsonContent.Create(payload, options: Json);
        }
        return request;
    }
}
