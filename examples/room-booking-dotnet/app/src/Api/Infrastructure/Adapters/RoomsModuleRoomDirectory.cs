using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Rooms.Application.Ports;
using Cowork.Api.Modules.Rooms.Contracts;

namespace Cowork.Api.Infrastructure.Adapters;

/// <summary>
/// Bridges the bookings module's room port to the rooms module's published queries.
/// The host owns this wiring; neither module reaches into the other.
/// </summary>
public sealed class RoomsModuleRoomDirectory(IRoomQueries roomQueries) : IRoomDirectory
{
    public Task<RoomSummary?> FindAsync(Guid roomId, CancellationToken cancellationToken) =>
        roomQueries.FindAsync(roomId, cancellationToken);

    public Task<IReadOnlyDictionary<Guid, string>> FindNamesAsync(
        IReadOnlyCollection<Guid> roomIds,
        CancellationToken cancellationToken
    ) => roomQueries.FindNamesAsync(roomIds, cancellationToken);
}
