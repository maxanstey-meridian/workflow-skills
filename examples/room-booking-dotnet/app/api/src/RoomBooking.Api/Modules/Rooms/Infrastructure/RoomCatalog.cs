using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Host.Persistence;
using RoomBooking.Api.Modules.Rooms.Contracts;
using RoomBooking.Api.Modules.Rooms.Domain;

namespace RoomBooking.Api.Modules.Rooms.Infrastructure;

public sealed class RoomCatalog(RoomBookingDbContext db) : IRoomCatalog
{
    public async Task<RoomSummary?> FindAsync(Guid roomId, CancellationToken cancellationToken)
    {
        var room = await db
            .Rooms.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == roomId, cancellationToken);
        return room is null ? null : RoomMapping.ToSummary(room);
    }
}

file static class RoomMapping
{
    public static RoomSummary ToSummary(Room room)
    {
        return new RoomSummary(room.Id, room.Name, room.Capacity);
    }
}
