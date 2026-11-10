using Cowork.Api.Modules.Rooms.Application.Ports;
using Cowork.Api.Modules.Rooms.Contracts;

namespace Cowork.Api.Modules.Rooms.Application.ListRooms;

public sealed class ListRoomsQuery(IRoomQueries roomQueries)
{
    public async Task<IReadOnlyList<RoomSummary>> ExecuteAsync(
        CancellationToken cancellationToken
    ) => await roomQueries.ListAsync(cancellationToken);
}
