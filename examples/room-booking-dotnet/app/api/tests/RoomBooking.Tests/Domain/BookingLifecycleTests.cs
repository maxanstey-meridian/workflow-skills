using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Tests.Domain;

public sealed class BookingLifecycleTests
{
    private static readonly DateTime SlotStart = new(2026, 11, 10, 9, 0, 0, DateTimeKind.Utc);

    private static BookingState Booked(DateTime startUtc) => new(BookingStatus.Booked, startUtc);

    [Fact]
    public void Check_in_opens_at_the_slot_start()
    {
        var before = BookingLifecycle.Refusal(
            Booked(SlotStart),
            BookingAction.CheckIn,
            SlotStart.AddMinutes(-1)
        );
        Assert.Equal(BookingRefusal.CheckInNotOpenYet, before);
        Assert.Null(BookingLifecycle.Refusal(Booked(SlotStart), BookingAction.CheckIn, SlotStart));
    }

    [Fact]
    public void Check_in_closes_fifteen_minutes_after_the_start()
    {
        Assert.Null(
            BookingLifecycle.Refusal(
                Booked(SlotStart),
                BookingAction.CheckIn,
                SlotStart.AddMinutes(15)
            )
        );
        var tooLate = BookingLifecycle.Refusal(
            Booked(SlotStart),
            BookingAction.CheckIn,
            SlotStart.AddMinutes(15).AddMinutes(1)
        );
        Assert.Equal(BookingRefusal.CheckInClosed, tooLate);
    }

    [Fact]
    public void Cancel_is_only_possible_before_the_start()
    {
        Assert.Null(
            BookingLifecycle.Refusal(
                Booked(SlotStart),
                BookingAction.Cancel,
                SlotStart.AddMinutes(-1)
            )
        );
        Assert.Equal(
            BookingRefusal.BookingHasStarted,
            BookingLifecycle.Refusal(Booked(SlotStart), BookingAction.Cancel, SlotStart)
        );
    }

    [Theory]
    [InlineData(BookingStatus.CheckedIn, BookingRefusal.AlreadyCheckedIn)]
    [InlineData(BookingStatus.Cancelled, BookingRefusal.Cancelled)]
    [InlineData(BookingStatus.Released, BookingRefusal.Released)]
    public void Terminal_states_refuse_both_actions(BookingStatus status, BookingRefusal expected)
    {
        var state = new BookingState(status, SlotStart);
        Assert.Equal(expected, BookingLifecycle.Refusal(state, BookingAction.CheckIn, SlotStart));
        Assert.Equal(
            expected,
            BookingLifecycle.Refusal(state, BookingAction.Cancel, SlotStart.AddMinutes(-1))
        );
        Assert.Empty(BookingLifecycle.Available(state, SlotStart));
    }

    [Fact]
    public void Available_lists_only_actions_the_decider_accepts()
    {
        var beforeStart = BookingLifecycle.Available(Booked(SlotStart), SlotStart.AddMinutes(-5));
        Assert.Equal([BookingAction.Cancel], beforeStart);

        var withinWindow = BookingLifecycle.Available(Booked(SlotStart), SlotStart.AddMinutes(5));
        Assert.Equal([BookingAction.CheckIn], withinWindow);

        var checkedIn = BookingLifecycle.Available(
            new BookingState(BookingStatus.CheckedIn, SlotStart),
            SlotStart
        );
        Assert.Empty(checkedIn);
    }
}
