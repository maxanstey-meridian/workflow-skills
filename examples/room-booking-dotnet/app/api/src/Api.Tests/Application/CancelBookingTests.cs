using Cowork.Api.Modules.Bookings.Application.CancelBooking;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Tests.TestSupport;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Application;

public sealed class CancelBookingTests
{
    private static readonly DateTimeOffset _start = new(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);

    private readonly InMemoryBookingRepository _bookings = new();
    private readonly FakeTimeProvider _time = new(_start.AddMinutes(-30));

    private CancelBookingUseCase CreateUseCase() => new(_bookings, _time);

    private async Task<Booking> GivenBooking(
        string memberEmail = "member@cowork.test",
        BookingStatus status = BookingStatus.Booked
    )
    {
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            RoomId = Guid.NewGuid(),
            MemberEmail = memberEmail,
            StartsAt = _start,
            EndsAt = _start.AddHours(1),
            Status = status,
            CreatedAt = _start.AddDays(-1),
        };
        (await _bookings.AddAsync(booking, CancellationToken.None)).Should().Be(SlotOutcome.Added);
        return booking;
    }

    [Fact]
    public async Task CancelsAMemberOwnBookedBooking()
    {
        var booking = await GivenBooking();

        var result = await CreateUseCase()
            .ExecuteAsync(
                new CancelBookingCommand(booking.Id, booking.MemberEmail),
                CancellationToken.None
            );

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(BookingStatus.Cancelled);
        _bookings.Bookings.Single().Status.Should().Be(BookingStatus.Cancelled);
    }

    [Fact]
    public async Task HidesAnotherMembersBooking()
    {
        var booking = await GivenBooking(memberEmail: "alex@cowork.test");

        var result = await CreateUseCase()
            .ExecuteAsync(
                new CancelBookingCommand(booking.Id, "sam@cowork.test"),
                CancellationToken.None
            );

        var error = result.Errors.OfType<AppError>().Single();
        error.Code.Should().Be("booking.not_found");
        _bookings.Bookings.Single().Status.Should().Be(BookingStatus.Booked);
    }

    [Fact]
    public async Task RefusesToCancelAnAlreadyCancelledBooking()
    {
        var booking = await GivenBooking(status: BookingStatus.Cancelled);

        var result = await CreateUseCase()
            .ExecuteAsync(
                new CancelBookingCommand(booking.Id, booking.MemberEmail),
                CancellationToken.None
            );

        var error = result.Errors.OfType<AppError>().Single();
        error.Code.Should().Be("booking.not_active");
    }

    [Fact]
    public async Task ReportsNoLongerActiveWhenARaceTakesTheTransition()
    {
        var booking = await GivenBooking();
        _bookings.FailNextTransition = true;

        var result = await CreateUseCase()
            .ExecuteAsync(
                new CancelBookingCommand(booking.Id, booking.MemberEmail),
                CancellationToken.None
            );

        var error = result.Errors.OfType<AppError>().Single();
        error.Code.Should().Be("booking.not_active");
        _bookings.Bookings.Single().Status.Should().Be(BookingStatus.Booked);
    }
}
