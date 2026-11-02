using RoomBooking.Api.Modules.Rooms.Application.Ports;

namespace RoomBooking.Api.Modules.Rooms.Application;

public sealed class ListRoomsQuery(IRoomFinder rooms)
{
    public async Task<IReadOnlyList<RoomRow>> ExecuteAsync(CancellationToken cancellationToken)
    {
        return await rooms.ListAsync(cancellationToken);
    }
}

public sealed record RoomRow(Guid Id, string Name, int Capacity);
