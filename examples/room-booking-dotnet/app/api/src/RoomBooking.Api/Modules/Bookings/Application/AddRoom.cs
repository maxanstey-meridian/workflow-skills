using System.Diagnostics;
using FluentResults;
using RoomBooking.Api.Kernel;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

public sealed record AddRoomOutcome(Guid RoomId);

public sealed class AddRoom(IRoomRepository rooms, TimeProvider clock)
{
    public async Task<Result<AddRoomOutcome>> ExecuteAsync(
        string name,
        int capacity,
        Actor actor,
        CancellationToken ct
    )
    {
        if (actor.Role != ActorRole.Staff)
        {
            return Result.Fail<AddRoomOutcome>(
                new AppError(
                    "room_add_forbidden",
                    "Only staff can add rooms.",
                    FailureStatus.Forbidden
                )
            );
        }

        var room = new Room(
            Guid.CreateVersion7(),
            name.Trim(),
            capacity,
            clock.GetUtcNow().UtcDateTime
        );
        var outcome = await rooms.AddAsync(room, ct);
        return outcome switch
        {
            RoomPersistOutcome.Persisted => Result.Ok(new AddRoomOutcome(room.Id)),
            RoomPersistOutcome.NameTaken => Result.Fail<AddRoomOutcome>(
                new AppError(
                    "room_name_taken",
                    "A room with this name already exists.",
                    FailureStatus.Conflict
                )
            ),
            _ => throw new UnreachableException($"{outcome} has no failure mapping"),
        };
    }
}
