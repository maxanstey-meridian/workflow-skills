using Cowork.Api.Modules.Rooms.Domain;

namespace Cowork.Api.Modules.Rooms.Application.Ports;

public interface RoomRepository
{
    public Task AddAsync(Room room, CancellationToken cancellationToken);
    public Task<bool> ExistsAsync(Guid roomId, CancellationToken cancellationToken);
    public Task<IReadOnlyList<Room>> ListAsync(CancellationToken cancellationToken);
}
