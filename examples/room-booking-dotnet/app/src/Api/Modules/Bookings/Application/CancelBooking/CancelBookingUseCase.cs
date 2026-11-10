using Cowork.Api.Modules.Bookings.Application.Bookings;
using Cowork.Api.Modules.Bookings.Application.Ports;
using FluentResults;

namespace Cowork.Api.Modules.Bookings.Application.CancelBooking;

public sealed record CancelBookingCommand(Guid BookingId);

public sealed class CancelBookingUseCase(
    IBookingRepository bookings,
    IRoomDirectory rooms,
    ISpaceClock clock,
    ICurrentMember currentMember
)
{
    public async Task<Result<BookingView>> ExecuteAsync(
        CancelBookingCommand command,
        CancellationToken cancellationToken
    )
    {
        var booking = await bookings.FindAsync(command.BookingId, cancellationToken);
        if (booking is null || booking.MemberId != currentMember.MemberId)
        {
            return Result.Fail(BookingErrors.NotFound());
        }

        var decision = booking.Cancel(clock.Now);
        if (!decision.Allowed)
        {
            return Result.Fail(BookingErrors.FromRefusal(decision));
        }

        await bookings.SaveAsync(cancellationToken);

        var names = await rooms.FindNamesAsync([booking.RoomId], cancellationToken);
        return Result.Ok(
            BookingViewAssembler.For(
                booking,
                names.GetValueOrDefault(booking.RoomId, string.Empty),
                clock.Now
            )
        );
    }
}
