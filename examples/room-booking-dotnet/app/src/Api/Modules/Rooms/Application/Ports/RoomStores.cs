using Cowork.Api.Modules.Rooms.Contracts;
using Cowork.Api.Modules.Rooms.Domain;

namespace Cowork.Api.Modules.Rooms.Application.Ports;

/// <summary>Registers new rooms.</summary>
public interface IRoomRepository
{
    public Task AddAsync(Room room, CancellationToken cancellationToken);
}

/// <summary>Reads rooms for screens and other modules.</summary>
public interface IRoomQueries
{
    public Task<IReadOnlyList<RoomSummary>> ListAsync(CancellationToken cancellationToken);

    public Task<RoomSummary?> FindAsync(Guid roomId, CancellationToken cancellationToken);

    public Task<IReadOnlyDictionary<Guid, string>> FindNamesAsync(
        IReadOnlyCollection<Guid> roomIds,
        CancellationToken cancellationToken
    );
}
