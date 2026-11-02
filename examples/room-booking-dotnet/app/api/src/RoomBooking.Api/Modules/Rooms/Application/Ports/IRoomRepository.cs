using RoomBooking.Api.Modules.Rooms.Domain;

namespace RoomBooking.Api.Modules.Rooms.Application.Ports;

public interface IRoomRepository
{
    /// <summary>
    ///     Adds the room and saves it. Throws <see cref="RoomNameTakenException" /> when the name
    ///     is already held by another room (Postgres unique violation 23505).
    /// </summary>
    public Task AddAsync(Room room, CancellationToken cancellationToken);
}

/// <summary>Thrown by the repository adapter when a room name is already taken.</summary>
public sealed class RoomNameTakenException(string roomName, Exception innerException)
    : Exception($"A room named '{roomName}' already exists.", innerException);
