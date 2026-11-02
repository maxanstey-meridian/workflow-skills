using FluentResults;
using FluentValidation;
using RoomBooking.Api.Modules.Rooms.Application.Ports;
using RoomBooking.Api.Modules.Rooms.Domain;

namespace RoomBooking.Api.Modules.Rooms.Application;

public sealed class AddRoomUseCase(
    IValidator<AddRoomCommand> validator,
    IRoomRepository rooms,
    TimeProvider clock
)
{
    public async Task<Result<AddRoomResult>> ExecuteAsync(
        AddRoomCommand command,
        CancellationToken cancellationToken
    )
    {
        var normalized = command with { Name = command.Name.Trim() };
        var validation = await validator.ValidateAsync(normalized, cancellationToken);
        if (!validation.IsValid)
        {
            return Result.Fail<AddRoomResult>(
                DeclaredError.Validation(DeclaredError.ErrorsOf(validation.Errors))
            );
        }

        var room = Room.Open(normalized.Name, normalized.Capacity, clock.GetUtcNow());
        try
        {
            await rooms.AddAsync(room, cancellationToken);
        }
        catch (RoomNameTakenException)
        {
            return Result.Fail<AddRoomResult>(
                new DeclaredError(
                    "ROOM_NAME_TAKEN",
                    $"A room named '{normalized.Name}' already exists."
                )
            );
        }

        return Result.Ok(new AddRoomResult(room.Id, room.Name, room.Capacity));
    }
}

public sealed record AddRoomCommand(string Name, int Capacity);

public sealed record AddRoomResult(Guid Id, string Name, int Capacity);
