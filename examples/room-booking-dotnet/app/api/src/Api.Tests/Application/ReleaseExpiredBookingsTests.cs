using Cowork.Api.Modules.Bookings.Application.ReleaseExpiredBookings;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Tests.TestSupport;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Application;

public sealed class ReleaseExpiredBookingsTests
{
    private static readonly DateTimeOffset _now = new(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);

    private readonly InMemoryBookingRepository _bookings = new();
    private readonly FakeTimeProvider _time = new(_now);

    private ReleaseExpiredBookingsUseCase CreateUseCase() => new(_bookings, _time);

    private async Task<Booking> GivenBooking(
        DateTimeOffset startsAt,
        BookingStatus status = BookingStatus.Booked
    )
    {
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            RoomId = Guid.NewGuid(),
            MemberEmail = "member@cowork.test",
            StartsAt = startsAt,
            EndsAt = startsAt.AddHours(1),
            Status = status,
            CreatedAt = startsAt.AddDays(-1),
        };
        (await _bookings.AddAsync(booking, CancellationToken.None)).Should().Be(SlotOutcome.Added);
        return booking;
    }

    [Fact]
    public async Task ReleasesABookedBookingFifteenMinutesAfterItsStart()
    {
        var expired = await GivenBooking(_now.AddMinutes(-75));
        var insideWindow = await GivenBooking(_now.AddMinutes(-14));

        var result = await CreateUseCase().ExecuteAsync(CancellationToken.None);

        result.ReleasedCount.Should().Be(1);
        _bookings
            .Bookings.Single(b => b.Id == expired.Id)
            .Status.Should()
            .Be(BookingStatus.Released);
        _bookings
            .Bookings.Single(b => b.Id == insideWindow.Id)
            .Status.Should()
            .Be(BookingStatus.Booked);
    }

    [Fact]
    public async Task NeverTouchesACheckedInBooking()
    {
        await GivenBooking(_now.AddHours(-2), BookingStatus.CheckedIn);

        var result = await CreateUseCase().ExecuteAsync(CancellationToken.None);

        result.ReleasedCount.Should().Be(0);
        _bookings.Bookings.Single().Status.Should().Be(BookingStatus.CheckedIn);
    }

    [Fact]
    public async Task IsIdempotent()
    {
        await GivenBooking(_now.AddMinutes(-30));

        (await CreateUseCase().ExecuteAsync(CancellationToken.None)).ReleasedCount.Should().Be(1);
        (await CreateUseCase().ExecuteAsync(CancellationToken.None)).ReleasedCount.Should().Be(0);
    }
}
