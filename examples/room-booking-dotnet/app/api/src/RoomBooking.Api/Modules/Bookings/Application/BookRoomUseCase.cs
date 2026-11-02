using FluentResults;
using FluentValidation;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

public sealed class BookRoomUseCase(
    IValidator<BookRoomCommand> validator,
    IBookingRepository bookings,
    IRoomDirectory rooms,
    TimeProvider clock
)
{
    public async Task<Result<BookingRow>> ExecuteAsync(
        BookRoomCommand command,
        CancellationToken cancellationToken
    )
    {
        var validation = await validator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            return Result.Fail<BookingRow>(DeclaredError.FromValidation(validation.Errors));
        }

        var now = clock.GetUtcNow();
        if (command.Start.ToUniversalTime() < now)
        {
            return Result.Fail<BookingRow>(
                new DeclaredError("START_IN_PAST", "The booking must start in the future.")
            );
        }

        var room = await rooms.FindAsync(command.RoomId, cancellationToken);
        if (room is null)
        {
            return Result.Fail<BookingRow>(
                new DeclaredError("UNKNOWN_ROOM", "That room does not exist.")
            );
        }

        var booking = Booking.Reserve(
            command.RoomId,
            command.ActorId,
            command.Start,
            command.End,
            now
        );
        try
        {
            await bookings.AddAsync(booking, cancellationToken);
        }
        catch (BookingConflictException)
        {
            // The room's overlap constraint refused the insert: someone else holds it.
            return Result.Fail<BookingRow>(
                new DeclaredError(
                    "ROOM_ALREADY_BOOKED",
                    "That room is already booked at overlapping times."
                )
            );
        }

        return Result.Ok(BookingRow.From(booking, room, now));
    }
}

public sealed record BookRoomCommand(
    Guid ActorId,
    Guid RoomId,
    DateTimeOffset Start,
    DateTimeOffset End
);
