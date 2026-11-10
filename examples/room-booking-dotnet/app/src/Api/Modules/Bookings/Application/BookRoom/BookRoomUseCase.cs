using Cowork.Api.Modules.Bookings.Application.Bookings;
using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;
using FluentResults;

namespace Cowork.Api.Modules.Bookings.Application.BookRoom;

public sealed record BookRoomCommand(Guid RoomId, DateTimeOffset StartsAt, DateTimeOffset EndsAt);

public sealed class BookRoomUseCase(
    IBookingRepository bookings,
    IRoomDirectory rooms,
    ISpaceClock clock,
    ICurrentMember currentMember
)
{
    public async Task<Result<BookingView>> ExecuteAsync(
        BookRoomCommand command,
        CancellationToken cancellationToken
    )
    {
        if (command.StartsAt >= command.EndsAt)
        {
            // Slot shape is checked at the transport edge too; this guards the domain
            // rule if a caller bypasses the wire contract.
            return Result.Fail(BookingErrors.InThePast());
        }

        if (command.StartsAt <= clock.Now)
        {
            return Result.Fail(BookingErrors.InThePast());
        }

        var room = await rooms.FindAsync(command.RoomId, cancellationToken);
        if (room is null)
        {
            return Result.Fail(BookingErrors.RoomNotFound());
        }

        var booking = Booking.Create(
            command.RoomId,
            currentMember.MemberId,
            command.StartsAt,
            command.EndsAt
        );
        var outcome = await bookings.AddAsync(booking, cancellationToken);
        if (outcome == AddBookingOutcome.RoomAlreadyHeld)
        {
            return Result.Fail(BookingErrors.RoomAlreadyHeld());
        }

        return Result.Ok(BookingViewAssembler.For(booking, room.Name, clock.Now));
    }
}
