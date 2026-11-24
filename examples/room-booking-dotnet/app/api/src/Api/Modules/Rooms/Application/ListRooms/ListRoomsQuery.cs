using Cowork.Api.Modules.Rooms.Application.Ports;

namespace Cowork.Api.Modules.Rooms.Application.ListRooms;

public sealed record RoomListItem(Guid Id, string Name, int Capacity);

public sealed record RoomLimits(int NameMaxLength, int CapacityMin, int CapacityMax);

public sealed record RoomList(IReadOnlyList<RoomListItem> Rooms, RoomLimits Limits);

public sealed class ListRoomsQuery(RoomRepository rooms)
{
    public async Task<RoomList> ExecuteAsync(CancellationToken cancellationToken)
    {
        var roomsList = await rooms.ListAsync(cancellationToken);
        return new RoomList(
            [
                .. roomsList
                    .Select(r => new RoomListItem(r.Id, r.Name, r.Capacity))
                    .OrderBy(r => r.Name),
            ],
            new RoomLimits(
                AddRoomLimits.NameMaxLength,
                AddRoomLimits.CapacityMin,
                AddRoomLimits.CapacityMax
            )
        );
    }
}
