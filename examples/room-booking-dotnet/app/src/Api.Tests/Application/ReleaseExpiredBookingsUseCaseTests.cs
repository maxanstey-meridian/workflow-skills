using Cowork.Api.Infrastructure.Adapters;
using Cowork.Api.Modules.Bookings.Application.ReleaseExpired;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Tests.TestSupport.Fakes;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Application;

public sealed class ReleaseExpiredBookingsUseCaseTests
{
    private static readonly Guid RoomId = new("11111111-1111-1111-1111-111111111111");
    private static readonly Guid MemberId = new("22222222-2222-2222-2222-222222222222");
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly FakeBookingRepository bookings = new();
    private readonly FakeTimeProvider clock = new(Now);

    private ReleaseExpiredBookingsUseCase CreateUseCase() =>
        new(
            bookings,
            new SpaceClock(
                clock,
                Options.Create(
                    new SpaceOptions { TimeZoneId = "Europe/London", ReminderEveningHour = 18 }
                )
            ),
            NullLoggerFactory()
        );

    private static ILogger<ReleaseExpiredBookingsUseCase> NullLoggerFactory() => new NUnitLogger();

    [Fact]
    public async Task A_booking_past_its_grace_is_released()
    {
        var booking = Seed(Now.AddMinutes(-30));

        var released = await CreateUseCase().ExecuteAsync(CancellationToken.None);

        released.Should().Be(1);
        booking.Status.Should().Be(BookingStatus.Released);
    }

    [Fact]
    public async Task A_booking_within_its_grace_stays()
    {
        Seed(Now.AddMinutes(-10));

        var released = await CreateUseCase().ExecuteAsync(CancellationToken.None);

        released.Should().Be(0);
    }

    [Fact]
    public async Task A_checked_in_booking_is_never_released_even_long_after_its_start()
    {
        var booking = Seed(Now.AddHours(-3));
        booking.CheckIn(Now.AddHours(-3));

        var released = await CreateUseCase().ExecuteAsync(CancellationToken.None);

        released.Should().Be(0);
        booking.Status.Should().Be(BookingStatus.CheckedIn);
    }

    private Booking Seed(DateTimeOffset startsAt)
    {
        var booking = Booking.Create(RoomId, MemberId, startsAt, startsAt.AddHours(1));
        bookings.Seed(booking);
        return booking;
    }

    private sealed class NUnitLogger : ILogger<ReleaseExpiredBookingsUseCase>
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
