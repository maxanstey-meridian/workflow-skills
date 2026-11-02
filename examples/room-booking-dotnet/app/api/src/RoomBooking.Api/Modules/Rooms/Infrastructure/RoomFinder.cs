using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Host.Persistence;
using RoomBooking.Api.Modules.Rooms.Application;
using RoomBooking.Api.Modules.Rooms.Application.Ports;

namespace RoomBooking.Api.Modules.Rooms.Infrastructure;

public sealed class RoomFinder(RoomBookingDbContext db) : IRoomFinder
{
    public async Task<IReadOnlyList<RoomRow>> ListAsync(CancellationToken cancellationToken)
    {
        return await db
            .Rooms.AsNoTracking()
            .OrderBy(room => room.Name)
            .Select(room => new RoomRow(room.Id, room.Name, room.Capacity))
            .ToListAsync(cancellationToken);
    }
}
