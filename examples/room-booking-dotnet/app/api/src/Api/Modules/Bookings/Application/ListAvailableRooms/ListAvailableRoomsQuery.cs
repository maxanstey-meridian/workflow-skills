using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Rooms.Contracts;

namespace Cowork.Api.Modules.Bookings.Application.ListAvailableRooms;

public sealed record AvailableRoomView(Guid Id, string Name, int Capacity);

public sealed class ListAvailableRoomsQuery(BookingRepository bookings, RoomDirectory rooms)
{
    public async Task<IReadOnlyList<AvailableRoomView>> ExecuteAsync(
        DateTimeOffset startsAt,
        DateTimeOffset endsAt,
        CancellationToken cancellationToken
    )
    {
        var all = await rooms.AllAsync(cancellationToken);
        var bookedRoomIds = await bookings.RoomIdsWithActiveBookingBetweenAsync(
            startsAt,
            endsAt,
            cancellationToken
        );
        return
        [
            .. all.Where(r => !bookedRoomIds.Contains(r.Id))
                .Select(r => new AvailableRoomView(r.Id, r.Name, r.Capacity)),
        ];
    }
}
