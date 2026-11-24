using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Tests.Domain;

public sealed class BookingLifecycleTests
{
    private static readonly Guid _roomId = Guid.NewGuid();
    private static readonly DateTimeOffset _start = new(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset _end = _start.AddHours(1);

    private static Booking MakeBooking(BookingStatus status) =>
        new()
        {
            Id = Guid.NewGuid(),
            RoomId = _roomId,
            MemberEmail = "member@cowork.test",
            StartsAt = _start,
            EndsAt = _end,
            Status = status,
            CreatedAt = _start.AddDays(-1),
        };

    [Fact]
    public void CancelIsAllowedWhileBooked()
    {
        var refusal = BookingLifecycle.Refusal(
            MakeBooking(BookingStatus.Booked),
            BookingAction.Cancel,
            _start.AddMinutes(-10)
        );
        refusal.Should().BeNull();
    }

    [Theory]
    [InlineData(BookingStatus.Cancelled)]
    [InlineData(BookingStatus.Released)]
    [InlineData(BookingStatus.CheckedIn)]
    public void CancelIsRefusedOnceTheBookingHasLeftBooked(BookingStatus status)
    {
        var refusal = BookingLifecycle.Refusal(
            MakeBooking(status),
            BookingAction.Cancel,
            _start.AddMinutes(-10)
        );
        refusal.Should().Be(BookingRefusal.AlreadySettled);
    }

    [Fact]
    public void CheckInIsRefusedBeforeTheBookingStarts()
    {
        var refusal = BookingLifecycle.Refusal(
            MakeBooking(BookingStatus.Booked),
            BookingAction.CheckIn,
            _start.AddMinutes(-1)
        );
        refusal.Should().Be(BookingRefusal.NotOpenYet);
    }

    [Fact]
    public void CheckInIsAllowedAtTheStart()
    {
        var refusal = BookingLifecycle.Refusal(
            MakeBooking(BookingStatus.Booked),
            BookingAction.CheckIn,
            _start
        );
        refusal.Should().BeNull();
    }

    [Fact]
    public void CheckInIsAllowedUpToFifteenMinutesAfterTheStart()
    {
        var atLimit = BookingLifecycle.Refusal(
            MakeBooking(BookingStatus.Booked),
            BookingAction.CheckIn,
            _start + BookingLifecycle.CheckInWindow
        );
        atLimit.Should().BeNull();
    }

    [Fact]
    public void CheckInIsRefusedAfterTheFifteenMinuteWindow()
    {
        var refusal = BookingLifecycle.Refusal(
            MakeBooking(BookingStatus.Booked),
            BookingAction.CheckIn,
            _start + BookingLifecycle.CheckInWindow + TimeSpan.FromSeconds(1)
        );
        refusal.Should().Be(BookingRefusal.WindowClosed);
    }

    [Fact]
    public void CheckInIsRefusedForANonBookedBooking()
    {
        var refusal = BookingLifecycle.Refusal(
            MakeBooking(BookingStatus.Released),
            BookingAction.CheckIn,
            _start.AddMinutes(5)
        );
        refusal.Should().Be(BookingRefusal.AlreadySettled);
    }

    [Fact]
    public void AvailableActionsFollowTheSameRefusals()
    {
        var before = BookingLifecycle.Available(
            MakeBooking(BookingStatus.Booked),
            _start.AddMinutes(-5)
        );
        before.Should().BeEquivalentTo([BookingAction.Cancel]);

        var during = BookingLifecycle.Available(
            MakeBooking(BookingStatus.Booked),
            _start.AddMinutes(5)
        );
        during.Should().BeEquivalentTo([BookingAction.Cancel, BookingAction.CheckIn]);

        var checkedIn = BookingLifecycle.Available(
            MakeBooking(BookingStatus.CheckedIn),
            _start.AddMinutes(5)
        );
        checkedIn.Should().BeEmpty();
    }
}
