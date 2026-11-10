using Cowork.Api.Infrastructure.Adapters;
using Cowork.Api.Modules.Bookings.Application.BookRoom;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Tests.TestSupport.Fakes;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Application;

public sealed class BookRoomUseCaseTests
{
    private static readonly Guid RoomId = new("11111111-1111-1111-1111-111111111111");
    private static readonly Guid MemberId = new("22222222-2222-2222-2222-222222222222");
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly FakeBookingRepository bookings = new();
    private readonly FakeRoomDirectory rooms = new FakeRoomDirectory().Seed(
        new RoomSummary(RoomId, "Focus Room", 4)
    );
    private readonly FakeTimeProvider clock = new(Now);

    private BookRoomUseCase CreateUseCase() =>
        new(
            bookings,
            rooms,
            new SpaceClock(
                clock,
                Options.Create(
                    new SpaceOptions { TimeZoneId = "Europe/London", ReminderEveningHour = 18 }
                )
            ),
            new FixedCurrentMember(MemberId)
        );

    private static BookRoomCommand TomorrowAt(int hour) =>
        new(RoomId, Now.AddDays(1).AddHours(hour), Now.AddDays(1).AddHours(hour + 1));

    [Fact]
    public async Task A_valid_booking_is_persisted_for_the_acting_member()
    {
        var result = await CreateUseCase().ExecuteAsync(TomorrowAt(9), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.RoomId.Should().Be(RoomId);
        result.Value.RoomName.Should().Be("Focus Room");
        result.Value.Status.Should().Be(BookingStatus.Booked);
        result
            .Value.AvailableActions.Should()
            .Contain(action => action.Action == BookingAction.Cancel && action.Enabled);
    }

    [Fact]
    public async Task A_booking_in_the_past_is_refused()
    {
        var command = new BookRoomCommand(RoomId, Now.AddMinutes(-5), Now.AddMinutes(55));

        var result = await CreateUseCase().ExecuteAsync(command, CancellationToken.None);

        result.IsFailed.Should().BeTrue();
        result.Errors[0].Metadata["code"].Should().Be("booking_in_past");
    }

    [Fact]
    public async Task An_unknown_room_is_refused()
    {
        var command = new BookRoomCommand(
            Guid.NewGuid(),
            TomorrowAt(9).StartsAt,
            TomorrowAt(9).EndsAt
        );

        var result = await CreateUseCase().ExecuteAsync(command, CancellationToken.None);

        result.Errors[0].Metadata["code"].Should().Be("room_not_found");
    }

    [Fact]
    public async Task A_room_already_held_at_overlapping_times_is_refused()
    {
        await CreateUseCase().ExecuteAsync(TomorrowAt(9), CancellationToken.None);

        var result = await CreateUseCase().ExecuteAsync(TomorrowAt(9), CancellationToken.None);

        result.Errors[0].Metadata["code"].Should().Be("room_already_booked");
    }
}
