using Cowork.Api.Modules.Bookings.Domain;
using static Cowork.Api.Modules.Bookings.Domain.BookingWindows;

namespace Cowork.Api.Tests.Domain;

/// <summary>The lifecycle rules in one place: the decider's verdicts for every state,
/// action, and part of the check-in and release windows.</summary>
public sealed class BookingDeciderTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);

    private static BookingState State(BookingStatus status, DateTimeOffset startsAt) =>
        new(status, startsAt, startsAt.AddHours(1));

    [Fact]
    public void A_booked_booking_can_be_cancelled_before_it_starts()
    {
        var decision = BookingDecider.DecideCancel(
            State(BookingStatus.Booked, Now.AddDays(1)),
            Now
        );

        decision.Allowed.Should().BeTrue();
    }

    [Fact]
    public void A_booked_booking_cannot_be_cancelled_once_it_has_started()
    {
        var decision = BookingDecider.DecideCancel(
            State(BookingStatus.Booked, Now.AddMinutes(-1)),
            Now
        );

        decision.Allowed.Should().BeFalse();
        decision.RefusalCode.Should().Be("booking_not_cancellable");
        decision.Reason.Should().Contain("released");
    }

    [Theory]
    [InlineData(BookingStatus.CheckedIn)]
    [InlineData(BookingStatus.Cancelled)]
    [InlineData(BookingStatus.Released)]
    public void A_booking_that_is_not_booked_cannot_be_cancelled(BookingStatus status)
    {
        var decision = BookingDecider.DecideCancel(State(status, Now.AddDays(1)), Now);

        decision.Allowed.Should().BeFalse();
        decision.RefusalCode.Should().Be("booking_not_cancellable");
    }

    [Fact]
    public void Check_in_opens_fifteen_minutes_before_the_start()
    {
        var justBefore = Now - CheckInOpensBeforeStart + TimeSpan.FromMinutes(1);

        var decision = BookingDecider.DecideCheckIn(State(BookingStatus.Booked, Now), justBefore);

        decision.Allowed.Should().BeTrue();
    }

    [Fact]
    public void Check_in_is_refused_before_it_opens()
    {
        var tooEarly = Now - CheckInOpensBeforeStart - TimeSpan.FromMinutes(1);

        var decision = BookingDecider.DecideCheckIn(State(BookingStatus.Booked, Now), tooEarly);

        decision.Allowed.Should().BeFalse();
        decision.RefusalCode.Should().Be("booking_not_checkable");
        decision.Reason.Should().Contain("15 minutes");
    }

    [Fact]
    public void Check_in_stays_open_for_the_release_grace_period()
    {
        var lastMoment = Now + ReleaseGraceAfterStart;

        var decision = BookingDecider.DecideCheckIn(State(BookingStatus.Booked, Now), lastMoment);

        decision.Allowed.Should().BeTrue();
    }

    [Fact]
    public void Check_in_is_refused_after_the_release_deadline()
    {
        var tooLate = Now + ReleaseGraceAfterStart + TimeSpan.FromMinutes(1);

        var decision = BookingDecider.DecideCheckIn(State(BookingStatus.Booked, Now), tooLate);

        decision.Allowed.Should().BeFalse();
        decision.RefusalCode.Should().Be("booking_not_checkable");
        decision.Reason.Should().Contain("released");
    }

    [Theory]
    [InlineData(BookingStatus.CheckedIn)]
    [InlineData(BookingStatus.Cancelled)]
    [InlineData(BookingStatus.Released)]
    public void A_booking_that_is_not_booked_cannot_be_checked_in(BookingStatus status)
    {
        var decision = BookingDecider.DecideCheckIn(State(status, Now.AddMinutes(5)), Now);

        decision.Allowed.Should().BeFalse();
        decision.RefusalCode.Should().Be("booking_not_checkable");
    }

    [Fact]
    public void A_booked_hold_past_its_grace_is_releasable()
    {
        var past = Now - ReleaseGraceAfterStart - TimeSpan.FromMinutes(1);

        BookingDecider.IsReleasable(State(BookingStatus.Booked, past), Now).Should().BeTrue();
    }

    [Fact]
    public void A_hold_within_its_grace_is_not_releasable()
    {
        var recent = Now - ReleaseGraceAfterStart + TimeSpan.FromMinutes(1);

        BookingDecider.IsReleasable(State(BookingStatus.Booked, recent), Now).Should().BeFalse();
    }

    [Fact]
    public void A_cancelled_booking_is_never_releasable()
    {
        var past = Now - TimeSpan.FromHours(2);

        BookingDecider.IsReleasable(State(BookingStatus.Cancelled, past), Now).Should().BeFalse();
    }

    [Fact]
    public void AvailableActions_lists_cancel_and_check_in_with_verdicts()
    {
        var actions = BookingDecider.AvailableActions(
            State(BookingStatus.Booked, Now.AddHours(1)),
            Now
        );

        actions
            .Select(entry => entry.Action)
            .Should()
            .Equal(BookingAction.Cancel, BookingAction.CheckIn);
        actions
            .First(entry => entry.Action == BookingAction.Cancel)
            .Decision.Allowed.Should()
            .BeTrue();
        actions
            .First(entry => entry.Action == BookingAction.CheckIn)
            .Decision.Allowed.Should()
            .BeFalse();
    }
}
