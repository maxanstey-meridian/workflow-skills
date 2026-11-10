using Cowork.Api.Infrastructure.Adapters;
using Cowork.Api.Modules.Bookings.Application.CancelBooking;
using Cowork.Api.Modules.Bookings.Application.CheckIn;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Tests.TestSupport.Fakes;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Application;

/// <summary>Cancelling and checking in through the entity's guarded transitions.</summary>
public sealed class BookingLifecycleUseCaseTests
{
    private static readonly Guid RoomId = new("11111111-1111-1111-1111-111111111111");
    private static readonly Guid MemberId = new("22222222-2222-2222-2222-222222222222");
    private static readonly Guid OtherMemberId = new("33333333-3333-3333-3333-333333333333");
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly FakeBookingRepository bookings = new();
    private readonly FakeTimeProvider clock = new(Now);

    private CancelBookingUseCase CreateCancelUseCase() =>
        new(
            bookings,
            new FakeRoomDirectory().Seed(new RoomSummary(RoomId, "Focus Room", 4)),
            new SpaceClock(
                clock,
                Options.Create(
                    new SpaceOptions { TimeZoneId = "Europe/London", ReminderEveningHour = 18 }
                )
            ),
            new FixedCurrentMember(MemberId)
        );

    private CheckInBookingUseCase CreateCheckInUseCase() =>
        new(
            bookings,
            new FakeRoomDirectory().Seed(new RoomSummary(RoomId, "Focus Room", 4)),
            new SpaceClock(
                clock,
                Options.Create(
                    new SpaceOptions { TimeZoneId = "Europe/London", ReminderEveningHour = 18 }
                )
            ),
            new FixedCurrentMember(MemberId)
        );

    [Fact]
    public async Task The_owner_can_cancel_a_future_booking()
    {
        var booking = Seed(Now.AddDays(1));

        var result = await CreateCancelUseCase()
            .ExecuteAsync(new CancelBookingCommand(booking.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(BookingStatus.Cancelled);
        result.Value.AvailableActions.Should().OnlyContain(action => !action.Enabled);
    }

    [Fact]
    public async Task Another_members_booking_is_not_found()
    {
        var booking = Seed(Now.AddDays(1), OtherMemberId);

        var result = await CreateCancelUseCase()
            .ExecuteAsync(new CancelBookingCommand(booking.Id), CancellationToken.None);

        result.IsFailed.Should().BeTrue();
        result.Errors[0].Metadata["code"].Should().Be("booking_not_found");
    }

    [Fact]
    public async Task A_started_booking_cannot_be_cancelled()
    {
        var booking = Seed(Now.AddMinutes(-5));

        var result = await CreateCancelUseCase()
            .ExecuteAsync(new CancelBookingCommand(booking.Id), CancellationToken.None);

        result.Errors[0].Metadata["code"].Should().Be("booking_not_cancellable");
        booking.Status.Should().Be(BookingStatus.Booked);
    }

    [Fact]
    public async Task A_member_can_check_in_inside_the_window()
    {
        var booking = Seed(Now.AddMinutes(-10));

        var result = await CreateCheckInUseCase()
            .ExecuteAsync(new CheckInCommand(booking.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(BookingStatus.CheckedIn);
    }

    [Fact]
    public async Task Check_in_is_refused_before_the_window_opens()
    {
        var booking = Seed(Now.AddHours(1));

        var result = await CreateCheckInUseCase()
            .ExecuteAsync(new CheckInCommand(booking.Id), CancellationToken.None);

        result.Errors[0].Metadata["code"].Should().Be("booking_not_checkable");
        result.Errors[0].Message.Should().Contain("15 minutes");
        booking.Status.Should().Be(BookingStatus.Booked);
    }

    private Booking Seed(DateTimeOffset startsAt, Guid? memberId = null)
    {
        var booking = Booking.Create(RoomId, memberId ?? MemberId, startsAt, startsAt.AddHours(1));
        bookings.Seed(booking);
        return booking;
    }
}
