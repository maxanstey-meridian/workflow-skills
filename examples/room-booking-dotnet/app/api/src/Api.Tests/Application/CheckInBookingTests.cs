using Cowork.Api.Modules.Bookings.Application.CheckInBooking;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Tests.TestSupport;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Application;

public sealed class CheckInBookingTests
{
    private static readonly DateTimeOffset _start = new(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);

    private readonly InMemoryBookingRepository _bookings = new();
    private readonly FakeTimeProvider _time = new(_start);

    private CheckInBookingUseCase CreateUseCase() => new(_bookings, _time);

    private async Task<Booking> GivenBooking(
        BookingStatus status = BookingStatus.Booked,
        DateTimeOffset? startsAt = null
    )
    {
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            RoomId = Guid.NewGuid(),
            MemberEmail = "member@cowork.test",
            StartsAt = startsAt ?? _start,
            EndsAt = (startsAt ?? _start).AddHours(1),
            Status = status,
            CreatedAt = _start.AddDays(-1),
        };
        (await _bookings.AddAsync(booking, CancellationToken.None)).Should().Be(SlotOutcome.Added);
        return booking;
    }

    [Fact]
    public async Task ChecksInAtTheStartOfTheBooking()
    {
        var booking = await GivenBooking();

        var result = await CreateUseCase()
            .ExecuteAsync(
                new CheckInBookingCommand(booking.Id, booking.MemberEmail),
                CancellationToken.None
            );

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(BookingStatus.CheckedIn);
        _bookings.Bookings.Single().Status.Should().Be(BookingStatus.CheckedIn);
    }

    [Fact]
    public async Task RefusesToCheckInBeforeTheBookingStarts()
    {
        var booking = await GivenBooking(startsAt: _start.AddMinutes(10));

        var result = await CreateUseCase()
            .ExecuteAsync(
                new CheckInBookingCommand(booking.Id, booking.MemberEmail),
                CancellationToken.None
            );

        var error = result.Errors.OfType<AppError>().Single();
        error.Code.Should().Be("booking.check_in_not_open");
    }

    [Fact]
    public async Task RefusesToCheckInAfterTheWindowCloses()
    {
        var booking = await GivenBooking();
        _time.Advance(BookingLifecycle.CheckInWindow + TimeSpan.FromSeconds(1));

        var result = await CreateUseCase()
            .ExecuteAsync(
                new CheckInBookingCommand(booking.Id, booking.MemberEmail),
                CancellationToken.None
            );

        var error = result.Errors.OfType<AppError>().Single();
        error.Code.Should().Be("booking.check_in_window_closed");
    }

    [Fact]
    public async Task RefusesToCheckInTwice()
    {
        var booking = await GivenBooking();
        (
            await CreateUseCase()
                .ExecuteAsync(
                    new CheckInBookingCommand(booking.Id, booking.MemberEmail),
                    CancellationToken.None
                )
        )
            .IsSuccess.Should()
            .BeTrue();

        var result = await CreateUseCase()
            .ExecuteAsync(
                new CheckInBookingCommand(booking.Id, booking.MemberEmail),
                CancellationToken.None
            );

        var error = result.Errors.OfType<AppError>().Single();
        error.Code.Should().Be("booking.not_active");
    }
}
