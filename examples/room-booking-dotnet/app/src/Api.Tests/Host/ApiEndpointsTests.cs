using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cowork.Api.Common;
using Cowork.Api.Tests.TestSupport;

namespace Cowork.Api.Tests.Host;

/// <summary>
/// Real HTTP tests against the real host: routing, the error envelope, the staff policy,
/// and the journeys a member takes. Rivet's static coverage does not replace these.
/// </summary>
[Collection("postgres")]
public sealed class ApiEndpointsTests(PostgresFixture db) : IAsyncLifetime
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private ApiFactory factory = null!;
    private HttpClient client = null!;

    public Task InitializeAsync()
    {
        factory = new ApiFactory(db.ConnectionString);
        client = factory.CreateClient();
        // The default persona for requests that don't name one.
        client.DefaultRequestHeaders.Add("X-Dev-User", "ben");
        return db.ResetAsync();
    }

    public async Task DisposeAsync()
    {
        client.Dispose();
        await factory.DisposeAsync();
    }

    [Fact]
    public async Task An_anonymous_caller_is_refused()
    {
        using var anonymous = factory.CreateClient();

        var response = await anonymous.GetAsync("/api/rooms");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_member_cannot_add_a_room_but_staff_can()
    {
        var asMember = await client.PostAsJsonAsync(
            "/api/rooms",
            new { name = "Nope", capacity = 2 },
            Json
        );
        asMember.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var asStaff = await SendStaffAsync(
            HttpMethod.Post,
            "/api/rooms",
            new { name = "Quiet Pod", capacity = 1 }
        );
        asStaff.StatusCode.Should().Be(HttpStatusCode.Created);

        var room = await asStaff.Content.ReadFromJsonAsync<RoomPayload>(Json);
        room!.Name.Should().Be("Quiet Pod");
        room.Capacity.Should().Be(1);
    }

    [Fact]
    public async Task An_invalid_room_is_a_422_in_the_error_envelope()
    {
        var response = await SendStaffAsync(
            HttpMethod.Post,
            "/api/rooms",
            new { name = "", capacity = 0 }
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        error!.Code.Should().Be("validation_failed");
        error.Errors.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Two_bookings_never_hold_the_same_room_at_overlapping_times()
    {
        var roomId = await AddRoomAsync("Focus Room");

        var first = await BookAsync("ben", roomId, "2026-11-11T09:00:00Z", "2026-11-11T10:00:00Z");
        first.StatusCode.Should().Be(HttpStatusCode.Created);

        var overlapping = await BookAsync(
            "cleo",
            roomId,
            "2026-11-11T09:30:00Z",
            "2026-11-11T10:30:00Z"
        );
        overlapping.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var conflict = await overlapping.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        conflict!.Code.Should().Be("room_already_booked");

        var adjacent = await BookAsync(
            "cleo",
            roomId,
            "2026-11-11T10:00:00Z",
            "2026-11-11T11:00:00Z"
        );
        adjacent.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Booking_an_unknown_room_is_a_404()
    {
        var response = await BookAsync(
            "ben",
            Guid.NewGuid(),
            "2026-11-11T09:00:00Z",
            "2026-11-11T10:00:00Z"
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        error!.Code.Should().Be("room_not_found");
    }

    [Fact]
    public async Task A_member_sees_only_their_own_bookings_and_can_cancel_one()
    {
        var roomId = await AddRoomAsync("Focus Room");
        await BookAsync("ben", roomId, "2026-11-11T09:00:00Z", "2026-11-11T10:00:00Z");
        await BookAsync("cleo", roomId, "2026-11-11T11:00:00Z", "2026-11-11T12:00:00Z");

        var bens = await GetBookingsAsync("ben");
        bens.Should().ContainSingle(booking => booking.RoomName == "Focus Room");

        var cleos = await GetBookingsAsync("cleo");
        cleos.Should().ContainSingle();

        // Ownership is enforced on the server: each member sees and cancels only their own.
        var cancelled = await client.SendAsync(CancelRequest("cleo", cleos[0].Id));
        cancelled.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await cancelled.Content.ReadFromJsonAsync<BookingPayload>(Json);
        body!.Status.Should().Be("Cancelled");
        body.AvailableActions.Should().OnlyContain(action => !action.Enabled);

        var bensAfter = await GetBookingsAsync("ben");
        bensAfter.Should().ContainSingle(booking => booking.Status == "Booked");
    }

    [Fact]
    public async Task Cancelling_twice_is_a_declared_conflict()
    {
        var roomId = await AddRoomAsync("Focus Room");
        var booked = await BookAsync("ben", roomId, "2026-11-11T09:00:00Z", "2026-11-11T10:00:00Z");
        var booking = await booked.Content.ReadFromJsonAsync<BookingPayload>(Json);

        await client.SendAsync(CancelRequest("ben", booking!.Id));
        var again = await client.SendAsync(CancelRequest("ben", booking.Id));

        again.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var error = await again.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        error!.Code.Should().Be("booking_not_cancellable");
    }

    [Fact]
    public async Task Check_in_opens_around_the_start_and_is_refused_outside_the_window()
    {
        var roomId = await AddRoomAsync("Focus Room");
        var soon = DateTime.UtcNow.AddMinutes(5).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'");
        var booked = await BookAsync("ben", roomId, soon, "2026-11-12T23:00:00Z");
        var booking = await booked.Content.ReadFromJsonAsync<BookingPayload>(Json);

        var checkIn = await client.SendAsync(CheckInRequest("ben", booking!.Id));
        checkIn.StatusCode.Should().Be(HttpStatusCode.OK);
        var checkedIn = await checkIn.Content.ReadFromJsonAsync<BookingPayload>(Json);
        checkedIn!.Status.Should().Be("CheckedIn");
    }

    [Fact]
    public async Task Check_in_is_refused_long_before_the_booking_starts()
    {
        var roomId = await AddRoomAsync("Focus Room");
        var booked = await BookAsync("ben", roomId, "2026-11-20T09:00:00Z", "2026-11-20T10:00:00Z");
        var booking = await booked.Content.ReadFromJsonAsync<BookingPayload>(Json);

        var checkIn = await client.SendAsync(CheckInRequest("ben", booking!.Id));

        checkIn.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var error = await checkIn.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        error!.Code.Should().Be("booking_not_checkable");
    }

    [Fact]
    public async Task The_day_view_shows_the_holds_one_room_already_has()
    {
        var roomId = await AddRoomAsync("Focus Room");
        await BookAsync("ben", roomId, "2026-11-11T09:00:00Z", "2026-11-11T10:00:00Z");

        var response = await client.GetAsync($"/api/rooms/{roomId}/day?date=2026-11-11");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var day = await response.Content.ReadFromJsonAsync<RoomDayPayload>(Json);
        day!.Holds.Should().ContainSingle(hold => hold.Status == "Booked");
    }

    private async Task<Guid> AddRoomAsync(string name)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/rooms")
        {
            Content = JsonContent.Create(new { name, capacity = 4 }, options: Json),
        };
        request.Headers.Add("X-Dev-User", "ada");
        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var room = await response.Content.ReadFromJsonAsync<RoomPayload>(Json);
        return room!.Id;
    }

    private async Task<HttpResponseMessage> SendStaffAsync(
        HttpMethod method,
        string path,
        object body
    )
    {
        using var request = new HttpRequestMessage(method, path)
        {
            Content = JsonContent.Create(body, options: Json),
        };
        request.Headers.Add("X-Dev-User", "ada");
        return await client.SendAsync(request);
    }

    private async Task<HttpResponseMessage> BookAsync(
        string persona,
        Guid roomId,
        string startsAt,
        string endsAt
    )
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/bookings")
        {
            Content = JsonContent.Create(
                new
                {
                    roomId,
                    startsAt,
                    endsAt,
                },
                options: Json
            ),
        };
        request.Headers.Add("X-Dev-User", persona);
        return await client.SendAsync(request);
    }

    private async Task<BookingPayload[]> GetBookingsAsync(string persona)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/bookings");
        request.Headers.Add("X-Dev-User", persona);
        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<BookingPayload[]>(Json) ?? [];
    }

    private static HttpRequestMessage CancelRequest(string persona, Guid bookingId)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/bookings/{bookingId}/cancel");
        request.Headers.Add("X-Dev-User", persona);
        return request;
    }

    private static HttpRequestMessage CheckInRequest(string persona, Guid bookingId)
    {
        var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/api/bookings/{bookingId}/check-in"
        );
        request.Headers.Add("X-Dev-User", persona);
        return request;
    }

    private sealed record RoomPayload(Guid Id, string Name, int Capacity);

    private sealed record BookingPayload(
        Guid Id,
        Guid RoomId,
        string RoomName,
        string StartsAt,
        string EndsAt,
        string Status,
        BookingActionPayload[] AvailableActions
    );

    private sealed record BookingActionPayload(string Action, bool Enabled, string? Reason);

    private sealed record RoomDayPayload(Guid RoomId, string Date, RoomHoldPayload[] Holds);

    private sealed record RoomHoldPayload(string StartsAt, string EndsAt, string Status);
}
