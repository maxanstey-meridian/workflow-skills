using Cowork.Api.Modules.Bookings.Application.SendBookingReminders;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Modules.Rooms.Contracts;
using Cowork.Api.Tests.TestSupport;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Application;

public sealed class SendBookingRemindersTests
{
    // The space runs on Europe/London; the reminder hour is a London evening.
    private static readonly TimeZoneInfo _london = TimeZoneInfo.FindSystemTimeZoneById(
        "Europe/London"
    );

    // Tuesday 24 November 2026, 18:00 London (UTC in November).
    private static readonly DateTimeOffset _eveningBefore = new(
        2026,
        11,
        24,
        18,
        0,
        0,
        TimeSpan.Zero
    );

    private static readonly Guid _roomId = Guid.NewGuid();

    private readonly InMemoryBookingRepository _bookings = new();
    private readonly FakeMailer _mailer = new();
    private readonly FakeTimeProvider _time = new(_eveningBefore);

    private SendBookingRemindersUseCase CreateUseCase() =>
        new(
            _bookings,
            new InMemoryRoomDirectory(new RoomSummary(_roomId, "Huddle", 4)),
            _mailer,
            _time,
            Microsoft.Extensions.Options.Options.Create(new ReminderOptions())
        );

    private async Task<Booking> GivenBooking(
        DateTimeOffset startsAt,
        BookingStatus status = BookingStatus.Booked,
        DateTimeOffset? reminderSentAt = null
    )
    {
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            RoomId = _roomId,
            MemberEmail = "member@cowork.test",
            StartsAt = startsAt,
            EndsAt = startsAt.AddHours(1),
            Status = status,
            CreatedAt = startsAt.AddDays(-2),
            ReminderSentAt = reminderSentAt,
        };
        (await _bookings.AddAsync(booking, CancellationToken.None)).Should().Be(SlotOutcome.Added);
        return booking;
    }

    private static DateTimeOffset LondonTime(int day, int hour) =>
        TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(new DateTime(2026, 11, day, hour, 0, 0), DateTimeKind.Unspecified),
            _london
        );

    [Fact]
    public async Task RemindsEveryBookedBookingForTomorrow()
    {
        var morning = await GivenBooking(LondonTime(25, 9));
        var evening = await GivenBooking(LondonTime(25, 17));

        var result = await CreateUseCase().ExecuteAsync(CancellationToken.None);

        result.SentCount.Should().Be(2);
        _mailer.Sent.Should().Contain(s => s.StartsAt == morning.StartsAt);
        _mailer.Sent.Should().Contain(s => s.StartsAt == evening.StartsAt);
        _mailer.Sent.Select(s => s.RoomName).Should().OnlyContain(name => name == "Huddle");
        _bookings.Bookings.Where(b => b.ReminderSentAt != null).Should().HaveCount(2);
    }

    [Fact]
    public async Task DoesNotRemindAboutOtherDaysOrCancelledBookings()
    {
        await GivenBooking(LondonTime(24, 21)); // later today
        await GivenBooking(LondonTime(24, 9)); // this morning
        await GivenBooking(LondonTime(26, 9)); // day after tomorrow
        await GivenBooking(LondonTime(25, 9), BookingStatus.Cancelled);

        var result = await CreateUseCase().ExecuteAsync(CancellationToken.None);

        result.SentCount.Should().Be(0);
        _mailer.Sent.Should().BeEmpty();
    }

    [Fact]
    public async Task NeverSendsASecondReminder()
    {
        var alreadyReminded = await GivenBooking(
            LondonTime(25, 9),
            reminderSentAt: _eveningBefore.AddHours(-1)
        );

        var result = await CreateUseCase().ExecuteAsync(CancellationToken.None);

        result.SentCount.Should().Be(0);
        _mailer.Sent.Should().BeEmpty();
        _bookings
            .Bookings.Single(b => b.Id == alreadyReminded.Id)
            .ReminderSentAt.Should()
            .Be(_eveningBefore.AddHours(-1));
    }
}
