using RoomBooking.Api.Modules.Bookings.Application.Ports;

namespace RoomBooking.Api.Modules.Bookings.Application;

public sealed record ListRoomsOutcome(IReadOnlyList<RoomRow> Rooms);

public sealed class ListRooms(IRoomQueries rooms)
{
    public async Task<ListRoomsOutcome> ExecuteAsync(CancellationToken ct)
    {
        var list = await rooms.ListAsync(ct);
        return new ListRoomsOutcome([
            .. list.OrderBy(r => r.Name, StringComparer.OrdinalIgnoreCase),
        ]);
    }
}
