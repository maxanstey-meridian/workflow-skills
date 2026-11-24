using Cowork.Api.Modules.Rooms.Domain;
using Cowork.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cowork.Api.Modules.Rooms.Infrastructure;

public sealed class EfRoomRepository(CoworkDbContext db) : Application.Ports.RoomRepository
{
    public async Task AddAsync(Room room, CancellationToken cancellationToken)
    {
        db.Rooms.Add(room);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> ExistsAsync(Guid roomId, CancellationToken cancellationToken) =>
        await db.Rooms.AnyAsync(r => r.Id == roomId, cancellationToken);

    public async Task<IReadOnlyList<Room>> ListAsync(CancellationToken cancellationToken) =>
        await db.Rooms.OrderBy(r => r.Name).ToListAsync(cancellationToken);
}
