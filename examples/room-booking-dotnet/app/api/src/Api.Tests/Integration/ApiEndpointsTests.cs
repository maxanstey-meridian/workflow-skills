using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cowork.Api.Tests.TestSupport;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Integration;

/// <summary>
/// The API's journeys through the real host and the real database: staff add
/// rooms, members book, cancel, and check in, and declared failures answer
/// with the documented error envelope.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class ApiEndpointsTests(CoworkTestDatabase database) : IAsyncLifetime
{
    private static readonly DateTimeOffset _now = new(2026, 12, 1, 9, 0, 0, TimeSpan.Zero);

    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    private const string Staff = "staff:maya@cowork.test";
    private const string Member = "member:alex@cowork.test";

    public Task InitializeAsync() => database.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    private WebApplicationFactory<Program> CreateHost(FakeTimeProvider? time = null)
    {
        var fixedTime = time ?? new FakeTimeProvider(_now);
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Development);
            builder.UseSetting("ConnectionStrings:Cowork", database.ConnectionString);
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<TimeProvider>();
                services.AddSingleton<TimeProvider>(fixedTime);
            });
        });
    }

    private static HttpClient Client(WebApplicationFactory<Program> host, string persona)
    {
        var client = host.CreateClient();
        client.DefaultRequestHeaders.Add("X-Dev-User", persona);
        return client;
    }

    [Fact]
    public async Task StaffAddsARoomAndMembersSeeItWithFormLimits()
    {
        using var host = CreateHost();
        var staff = Client(host, Staff);
        var member = Client(host, Member);

        var add = await staff.PostAsJsonAsync("/api/rooms", new { name = "Huddle", capacity = 4 });
        add.StatusCode.Should().Be(HttpStatusCode.Created);
        var added = await add.Content.ReadFromJsonAsync<RoomResponse>(_jsonOptions);
        added!.Name.Should().Be("Huddle");

        var list = await member.GetAsync("/api/rooms");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var rooms = await list.Content.ReadFromJsonAsync<RoomsResponse>(_jsonOptions);
        rooms!.Rooms.Should().Contain(r => r.Id == added.Id && r.Capacity == 4);
        rooms.Limits.NameMaxLength.Should().Be(80);
        rooms.Limits.CapacityMin.Should().Be(1);
    }

    [Fact]
    public async Task OnlyStaffCanAddRooms()
    {
        using var host = CreateHost();
        var member = Client(host, Member);

        var response = await member.PostAsJsonAsync(
            "/api/rooms",
            new { name = "Sneaky", capacity = 2 }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AnonymousCallersAreRejected()
    {
        using var host = CreateHost();
        var anonymous = host.CreateClient();

        var response = await anonymous.GetAsync("/api/rooms");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MemberBooksARoomForASlot()
    {
        using var host = CreateHost();
        var roomId = await GivenRoomAsync(host);
        var member = Client(host, Member);

        var book = await member.PostAsJsonAsync(
            "/api/bookings",
            new
            {
                roomId,
                startsAt = _now.AddHours(1),
                endsAt = _now.AddHours(2),
            }
        );

        book.StatusCode.Should().Be(HttpStatusCode.Created);
        var booked = await book.Content.ReadFromJsonAsync<BookedResponse>(_jsonOptions);
        booked!.Id.Should().NotBeEmpty();

        var mine = await member.GetFromJsonAsync<MyBookingsResponse>(
            "/api/bookings/mine",
            _jsonOptions
        );
        mine!.Bookings.Should().ContainSingle();
        var view = mine.Bookings.Single();
        view.RoomId.Should().Be(roomId);
        view.Status.Should().Be("booked");
        view.AvailableActions.Should().BeEquivalentTo(["cancel"]);
    }

    [Fact]
    public async Task SecondBookingForAnOverlappingSlotIsRefused()
    {
        using var host = CreateHost();
        var roomId = await GivenRoomAsync(host);
        var member = Client(host, Member);
        var slot = new
        {
            roomId,
            startsAt = _now.AddHours(1),
            endsAt = _now.AddHours(2),
        };
        (await member.PostAsJsonAsync("/api/bookings", slot))
            .StatusCode.Should()
            .Be(HttpStatusCode.Created);

        var conflict = await member.PostAsJsonAsync("/api/bookings", slot);
        var adjacent = await member.PostAsJsonAsync(
            "/api/bookings",
            new
            {
                roomId,
                startsAt = _now.AddHours(2),
                endsAt = _now.AddHours(3),
            }
        );

        conflict.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var error = await conflict.Content.ReadFromJsonAsync<ErrorResponse>(_jsonOptions);
        error!.Code.Should().Be("booking.slot_taken");
        adjacent.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task BookingAnUnknownRoomIsNotFound()
    {
        using var host = CreateHost();
        var member = Client(host, Member);

        var response = await member.PostAsJsonAsync(
            "/api/bookings",
            new
            {
                roomId = Guid.NewGuid(),
                startsAt = _now.AddHours(1),
                endsAt = _now.AddHours(2),
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(_jsonOptions);
        error!.Code.Should().Be("room.not_found");
    }

    [Fact]
    public async Task BookingInThePastIsUnprocessable()
    {
        using var host = CreateHost();
        var roomId = await GivenRoomAsync(host);
        var member = Client(host, Member);

        var response = await member.PostAsJsonAsync(
            "/api/bookings",
            new
            {
                roomId,
                startsAt = _now.AddMinutes(-30),
                endsAt = _now.AddMinutes(30),
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(_jsonOptions);
        error!.Code.Should().Be("time.in_past");
    }

    [Fact]
    public async Task MalformedBookingShapeIsUnprocessable()
    {
        using var host = CreateHost();
        var roomId = await GivenRoomAsync(host);
        var member = Client(host, Member);

        var response = await member.PostAsJsonAsync(
            "/api/bookings",
            new
            {
                roomId,
                startsAt = _now.AddHours(2),
                endsAt = _now.AddHours(1),
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(_jsonOptions);
        error!.Code.Should().Be("validation.failed");
        error.Errors.Should().NotBeNull();
    }

    [Fact]
    public async Task MemberCancelsAndTheSlotFreesUp()
    {
        using var host = CreateHost();
        var roomId = await GivenRoomAsync(host);
        var member = Client(host, Member);
        var bookingId = await GivenBookingAsync(host, roomId, _now.AddHours(1), _now.AddHours(2));

        var cancel = await member.PostAsync($"/api/bookings/{bookingId}/cancel", content: null);

        cancel.StatusCode.Should().Be(HttpStatusCode.OK);
        var state = await cancel.Content.ReadFromJsonAsync<BookingStateResponse>(_jsonOptions);
        state!.Status.Should().Be("cancelled");

        var mine = await member.GetFromJsonAsync<MyBookingsResponse>(
            "/api/bookings/mine",
            _jsonOptions
        );
        mine!.Bookings.Single().AvailableActions.Should().BeEmpty();

        var rebook = await member.PostAsJsonAsync(
            "/api/bookings",
            new
            {
                roomId,
                startsAt = _now.AddHours(1),
                endsAt = _now.AddHours(2),
            }
        );
        rebook.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task MemberCannotCancelAnotherMembersBooking()
    {
        using var host = CreateHost();
        var roomId = await GivenRoomAsync(host);
        var bookingId = await GivenBookingAsync(
            host,
            roomId,
            _now.AddHours(1),
            _now.AddHours(2),
            persona: "member:sam@cowork.test"
        );

        var cancel = await Client(host, Member)
            .PostAsync($"/api/bookings/{bookingId}/cancel", content: null);

        cancel.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CancellingAnUnknownBookingIsNotFound()
    {
        using var host = CreateHost();
        var member = Client(host, Member);

        var cancel = await member.PostAsync(
            $"/api/bookings/{Guid.NewGuid()}/cancel",
            content: null
        );

        cancel.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task MemberChecksInWhenTheBookingStarts()
    {
        var time = new FakeTimeProvider(_now);
        using var host = CreateHost(time);
        var roomId = await GivenRoomAsync(host);
        var member = Client(host, Member);
        var bookingId = await GivenBookingAsync(host, roomId, _now.AddHours(1), _now.AddHours(2));

        var tooEarly = await member.PostAsync($"/api/bookings/{bookingId}/check-in", content: null);
        time.Advance(TimeSpan.FromHours(1));
        var checkIn = await member.PostAsync($"/api/bookings/{bookingId}/check-in", content: null);
        var again = await member.PostAsync($"/api/bookings/{bookingId}/check-in", content: null);

        tooEarly.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await tooEarly.Content.ReadFromJsonAsync<ErrorResponse>(_jsonOptions))!
            .Code.Should()
            .Be("booking.check_in_not_open");
        checkIn.StatusCode.Should().Be(HttpStatusCode.OK);
        (await checkIn.Content.ReadFromJsonAsync<BookingStateResponse>(_jsonOptions))!
            .Status.Should()
            .Be("checkedIn");
        again.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await again.Content.ReadFromJsonAsync<ErrorResponse>(_jsonOptions))!
            .Code.Should()
            .Be("booking.not_active");
    }

    [Fact]
    public async Task CheckInClosesFifteenMinutesAfterTheStart()
    {
        var time = new FakeTimeProvider(_now);
        using var host = CreateHost(time);
        var roomId = await GivenRoomAsync(host);
        var member = Client(host, Member);
        var bookingId = await GivenBookingAsync(host, roomId, _now.AddHours(1), _now.AddHours(2));

        time.Advance(TimeSpan.FromHours(1).Add(TimeSpan.FromMinutes(16)));
        // The sweep has now released the booking, so the window is moot:
        // the member can no longer check in either way.
        var checkIn = await member.PostAsync($"/api/bookings/{bookingId}/check-in", content: null);

        checkIn.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await checkIn.Content.ReadFromJsonAsync<ErrorResponse>(_jsonOptions))!
            .Code.Should()
            .Be("booking.not_active");
    }

    [Fact]
    public async Task AvailableRoomsListsOnlyRoomsFreeForTheSlot()
    {
        using var host = CreateHost();
        var busy = await GivenRoomAsync(host, "Busy");
        var free = await GivenRoomAsync(host, "Free");
        var member = Client(host, Member);
        var slot = new { startsAt = _now.AddHours(1), endsAt = _now.AddHours(2) };
        (
            await member.PostAsJsonAsync(
                "/api/bookings",
                new
                {
                    roomId = busy,
                    slot.startsAt,
                    slot.endsAt,
                }
            )
        )
            .StatusCode.Should()
            .Be(HttpStatusCode.Created);

        var response = await member.GetAsync(
            $"/api/rooms/available?startsAt={Uri.EscapeDataString(slot.startsAt.ToString("O"))}&endsAt={Uri.EscapeDataString(slot.endsAt.ToString("O"))}"
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var rooms = await response.Content.ReadFromJsonAsync<AvailableRoomsResponse>(_jsonOptions);
        rooms!.Rooms.Select(r => r.Name).Should().BeEquivalentTo(["Free"]);
    }

    private async Task<Guid> GivenRoomAsync(
        WebApplicationFactory<Program> host,
        string name = "Huddle"
    )
    {
        var staff = Client(host, Staff);
        var response = await staff.PostAsJsonAsync("/api/rooms", new { name, capacity = 4 });
        response.EnsureSuccessStatusCode();
        var room = await response.Content.ReadFromJsonAsync<RoomResponse>(_jsonOptions);
        return room!.Id;
    }

    private async Task<Guid> GivenBookingAsync(
        WebApplicationFactory<Program> host,
        Guid roomId,
        DateTimeOffset startsAt,
        DateTimeOffset endsAt,
        string persona = Member
    )
    {
        var client = Client(host, persona);
        var response = await client.PostAsJsonAsync(
            "/api/bookings",
            new
            {
                roomId,
                startsAt,
                endsAt,
            }
        );
        response.EnsureSuccessStatusCode();
        var booked = await response.Content.ReadFromJsonAsync<BookedResponse>(_jsonOptions);
        return booked!.Id;
    }

    private sealed record RoomResponse(Guid Id, string Name, int Capacity);

    private sealed record RoomLimitsResponse(int NameMaxLength, int CapacityMin, int CapacityMax);

    private sealed record RoomsResponse(
        IReadOnlyList<RoomResponse> Rooms,
        RoomLimitsResponse Limits
    );

    private sealed record BookedResponse(Guid Id);

    private sealed record BookingStateResponse(Guid Id, string Status);

    private sealed record BookingResponse(
        Guid Id,
        Guid RoomId,
        string RoomName,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt,
        string Status,
        IReadOnlyList<string> AvailableActions
    );

    private sealed record MyBookingsResponse(IReadOnlyList<BookingResponse> Bookings);

    private sealed record AvailableRoomResponse(Guid Id, string Name, int Capacity);

    private sealed record AvailableRoomsResponse(IReadOnlyList<AvailableRoomResponse> Rooms);

    private sealed record ErrorResponse(
        string Code,
        string Message,
        IReadOnlyDictionary<string, string[]>? Errors = null
    );
}
