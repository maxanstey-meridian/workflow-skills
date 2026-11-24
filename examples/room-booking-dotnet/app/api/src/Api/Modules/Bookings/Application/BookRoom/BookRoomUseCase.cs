using Cowork.Api.Common;
using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Modules.Rooms.Application;
using Cowork.Api.Modules.Rooms.Contracts;
using FluentResults;
using FluentValidation;

namespace Cowork.Api.Modules.Bookings.Application.BookRoom;

public sealed record BookRoomCommand(
    Guid RoomId,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string MemberEmail
);

public sealed record BookRoomResult(Guid Id);

public sealed class BookRoomCommandValidator : AbstractValidator<BookRoomCommand>
{
    public BookRoomCommandValidator()
    {
        RuleFor(c => c.RoomId).NotEmpty().WithErrorCode("room.required");
        RuleFor(c => c.EndsAt).GreaterThan(c => c.StartsAt).WithErrorCode("slot.end_before_start");
        RuleFor(c => c.MemberEmail).NotEmpty().WithErrorCode("member.required");
    }
}

public sealed class BookRoomUseCase(
    IValidator<BookRoomCommand> validator,
    BookingRepository bookings,
    RoomDirectory rooms,
    TimeProvider time
)
{
    public async Task<Result<BookRoomResult>> ExecuteAsync(
        BookRoomCommand command,
        CancellationToken cancellationToken
    )
    {
        var validation = await validator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            return Result.Fail<BookRoomResult>(validation.ToAppError());
        }

        var now = time.GetUtcNow();
        if (command.StartsAt < now)
        {
            return Result.Fail<BookRoomResult>(BookingErrors.InPast);
        }

        if (!await rooms.ExistsAsync(command.RoomId, cancellationToken))
        {
            return Result.Fail<BookRoomResult>(RoomsErrors.NotFound);
        }

        var booking = new Booking
        {
            Id = Guid.CreateVersion7(),
            RoomId = command.RoomId,
            MemberEmail = command.MemberEmail,
            StartsAt = command.StartsAt,
            EndsAt = command.EndsAt,
            Status = BookingStatus.Booked,
            CreatedAt = now,
        };

        // The database's exclusion index decides, so two concurrent bookings
        // for an overlapping slot can never both hold the room.
        var outcome = await bookings.AddAsync(booking, cancellationToken);
        return outcome == SlotOutcome.RoomAlreadyBooked
            ? Result.Fail<BookRoomResult>(BookingErrors.SlotTaken)
            : Result.Ok(new BookRoomResult(booking.Id));
    }
}
