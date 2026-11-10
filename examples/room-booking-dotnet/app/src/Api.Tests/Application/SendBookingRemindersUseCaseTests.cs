using Cowork.Api.Infrastructure.Adapters;
using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Application.SendReminders;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Tests.TestSupport.Fakes;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Application;

/// <summary>The evening-before rule: a reminder goes out at or after 18:00 in the space's
/// own time zone, on the day before the booking's local start date.</summary>
public sealed class SendBookingRemindersUseCaseTests
{
    private static readonly Guid RoomId = new("11111111-1111-1111-1111-111111111111");
    private static readonly Guid MemberId = new("22222222-2222-2222-2222-222222222222");
    private static readonly Guid OtherMemberId = new("33333333-3333-3333-3333-333333333333");
    private static readonly Guid UnknownMemberId = new("44444444-4444-4444-4444-444444444444");

    private readonly FakeBookingRepository bookings = new();
    private readonly FakeBookingReminders reminders = new();
    private readonly FakeMemberDirectory members = new FakeMemberDirectory().Seed(
        new MemberContact(MemberId, "Ben", "ben@cowork.test"),
        new MemberContact(OtherMemberId, "Cleo", "cleo@cowork.test")
    );
    private readonly FakeTimeProvider clock = new(
        new DateTimeOffset(2026, 11, 10, 17, 0, 0, TimeSpan.Zero)
    ); // Tue 10 Nov, 17:00 London — before the reminder hour

    private void EveningOfTheDayBefore() =>
        clock.SetUtcNow(new DateTimeOffset(2026, 11, 10, 18, 5, 0, TimeSpan.Zero));

    private SendBookingRemindersUseCase CreateUseCase() =>
        new(
            bookings,
            new FakeRoomDirectory().Seed(new RoomSummary(RoomId, "Focus Room", 4)),
            members,
            reminders,
            new SpaceClock(
                clock,
                Options.Create(
                    new SpaceOptions { TimeZoneId = "Europe/London", ReminderEveningHour = 18 }
                )
            ),
            new TimeOnly(18, 0),
            new CapturingLogger()
        );

    [Fact]
    public async Task A_booking_tomorrow_is_reminded_tonight_after_the_reminder_hour()
    {
        Seed(MemberId, new DateTimeOffset(2026, 11, 11, 9, 0, 0, TimeSpan.Zero));
        EveningOfTheDayBefore();

        await CreateUseCase().ExecuteAsync(CancellationToken.None);

        reminders.Sent.Should().HaveCount(1);
        reminders.Sent[0].Email.Should().Be("ben@cowork.test");
        reminders.Sent[0].Subject.Should().Contain("Focus Room");
    }

    [Fact]
    public async Task Nothing_is_sent_before_the_reminder_hour()
    {
        clock.SetUtcNow(new DateTimeOffset(2026, 11, 10, 17, 0, 0, TimeSpan.Zero));
        Seed(MemberId, new DateTimeOffset(2026, 11, 11, 9, 0, 0, TimeSpan.Zero));

        await CreateUseCase().ExecuteAsync(CancellationToken.None);

        reminders.Sent.Should().BeEmpty();
    }

    [Fact]
    public async Task A_booking_the_day_after_tomorrow_is_not_reminded_yet()
    {
        Seed(MemberId, new DateTimeOffset(2026, 11, 12, 9, 0, 0, TimeSpan.Zero));

        await CreateUseCase().ExecuteAsync(CancellationToken.None);

        reminders.Sent.Should().BeEmpty();
    }

    [Fact]
    public async Task A_reminded_booking_is_not_reminded_twice()
    {
        var booking = Seed(MemberId, new DateTimeOffset(2026, 11, 11, 9, 0, 0, TimeSpan.Zero));
        booking.MarkReminderSent(clock.GetUtcNow());

        await CreateUseCase().ExecuteAsync(CancellationToken.None);

        reminders.Sent.Should().BeEmpty();
    }

    [Fact]
    public async Task A_failed_send_is_not_marked_so_the_next_tick_retries()
    {
        var booking = Seed(MemberId, new DateTimeOffset(2026, 11, 11, 9, 0, 0, TimeSpan.Zero));
        EveningOfTheDayBefore();
        reminders.FailureOnNextSend = new InvalidOperationException("smtp down");

        await CreateUseCase().ExecuteAsync(CancellationToken.None);

        reminders.Sent.Should().BeEmpty();
        booking.ReminderSentAt.Should().BeNull();

        await CreateUseCase().ExecuteAsync(CancellationToken.None);

        reminders.Sent.Should().HaveCount(1);
        booking.ReminderSentAt.Should().Be(clock.GetUtcNow());
    }

    [Fact]
    public async Task A_member_without_contact_details_is_skipped_without_failing_the_run()
    {
        var booking = Seed(
            UnknownMemberId,
            new DateTimeOffset(2026, 11, 11, 9, 0, 0, TimeSpan.Zero)
        );
        Seed(OtherMemberId, new DateTimeOffset(2026, 11, 11, 10, 0, 0, TimeSpan.Zero));
        EveningOfTheDayBefore();

        await CreateUseCase().ExecuteAsync(CancellationToken.None);

        reminders.Sent.Should().ContainSingle();
        reminders.Sent[0].Email.Should().Be("cleo@cowork.test");
        booking.ReminderSentAt.Should().BeNull();
    }

    private Booking Seed(Guid memberId, DateTimeOffset startsAt)
    {
        var booking = Booking.Create(RoomId, memberId, startsAt, startsAt.AddHours(1));
        bookings.Seed(booking);
        return booking;
    }

    private sealed class CapturingLogger : ILogger<SendBookingRemindersUseCase>
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => false;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter
        ) { }
    }
}
