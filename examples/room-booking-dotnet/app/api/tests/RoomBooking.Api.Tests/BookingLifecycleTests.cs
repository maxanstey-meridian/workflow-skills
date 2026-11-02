using FluentAssertions;
using RoomBooking.Api.Modules.Bookings.Domain;
using Xunit;

namespace RoomBooking.Api.Tests;

public sealed class BookingLifecycleTests
{
    private static readonly DateTimeOffset Start = new(2026, 11, 2, 10, 0, 0, TimeSpan.Zero);

    private static readonly DateTimeOffset End = Start.AddHours(1);

    [Theory]
    [InlineData(BookingStatus.Booked, -30, BookingAction.Cancel, null)]
    [InlineData(BookingStatus.Booked, 5, BookingAction.Cancel, null)]
    [InlineData(BookingStatus.Booked, 15, BookingAction.Cancel, null)]
    [InlineData(BookingStatus.Booked, 45, BookingAction.Cancel, null)]
    [InlineData(BookingStatus.Booked, 61, BookingAction.Cancel, BookingRefusal.AlreadyEnded)]
    [InlineData(BookingStatus.CheckedIn, 5, BookingAction.Cancel, null)]
    [InlineData(BookingStatus.CheckedIn, 61, BookingAction.Cancel, BookingRefusal.AlreadyEnded)]
    [InlineData(BookingStatus.Cancelled, 5, BookingAction.Cancel, BookingRefusal.NotActive)]
    [InlineData(BookingStatus.Released, 5, BookingAction.Cancel, BookingRefusal.NotActive)]
    [InlineData(BookingStatus.Booked, -30, BookingAction.CheckIn, BookingRefusal.CheckInNotOpen)]
    [InlineData(BookingStatus.Booked, 0, BookingAction.CheckIn, null)]
    [InlineData(BookingStatus.Booked, 5, BookingAction.CheckIn, null)]
    [InlineData(BookingStatus.Booked, 14.99, BookingAction.CheckIn, null)]
    [InlineData(
        BookingStatus.Booked,
        15,
        BookingAction.CheckIn,
        BookingRefusal.CheckInWindowClosed
    )]
    [InlineData(
        BookingStatus.Booked,
        30,
        BookingAction.CheckIn,
        BookingRefusal.CheckInWindowClosed
    )]
    [InlineData(
        BookingStatus.Booked,
        61,
        BookingAction.CheckIn,
        BookingRefusal.CheckInWindowClosed
    )]
    [InlineData(BookingStatus.CheckedIn, 5, BookingAction.CheckIn, BookingRefusal.AlreadyCheckedIn)]
    [InlineData(BookingStatus.Cancelled, 5, BookingAction.CheckIn, BookingRefusal.NotActive)]
    [InlineData(BookingStatus.Released, 5, BookingAction.CheckIn, BookingRefusal.NotActive)]
    public void The_decider_refuses_exactly_the_state_conflicts(
        BookingStatus status,
        double minutesFromStart,
        BookingAction action,
        BookingRefusal? expected
    )
    {
        var snapshot = new BookingSnapshot(status, Start, End);
        var now = Start.AddMinutes(minutesFromStart);

        BookingLifecycle.Refusal(snapshot, action, now).Should().Be(expected);
    }

    [Fact]
    public void Available_agrees_with_Refusal_for_every_state_and_moment()
    {
        foreach (var status in Enum.GetValues<BookingStatus>())
        {
            foreach (
                var minutesFromStart in new double[] { -60, -0.5, 0, 5, 14.99, 15, 45, 60, 61, 120 }
            )
            {
                var snapshot = new BookingSnapshot(status, Start, End);
                var now = Start.AddMinutes(minutesFromStart);

                BookingLifecycle
                    .Available(snapshot, now)
                    .Should()
                    .Equal(
                        Enum.GetValues<BookingAction>()
                            .Where(action =>
                                BookingLifecycle.Refusal(snapshot, action, now) is null
                            )
                            .ToList()
                    );
            }
        }
    }
}
