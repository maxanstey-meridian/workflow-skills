using Cowork.Api.Modules.Rooms.Application.Ports;
using Cowork.Api.Modules.Rooms.Contracts;
using Cowork.Api.Modules.Rooms.Domain;
using FluentResults;

namespace Cowork.Api.Modules.Rooms.Application.AddRoom;

public sealed record AddRoomCommand(string Name, int Capacity);

/// <summary>Adds a room. The request's shape is validated at the transport edge; this use
/// case creates the room.</summary>
public sealed class AddRoomUseCase(IRoomRepository rooms)
{
    public async Task<Result<RoomSummary>> ExecuteAsync(
        AddRoomCommand command,
        CancellationToken cancellationToken
    )
    {
        var room = Room.Create(command.Name, command.Capacity);
        await rooms.AddAsync(room, cancellationToken);
        return Result.Ok(new RoomSummary(room.Id, room.Name, room.Capacity));
    }
}
