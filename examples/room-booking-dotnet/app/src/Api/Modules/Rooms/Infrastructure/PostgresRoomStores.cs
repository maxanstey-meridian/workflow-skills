using Cowork.Api.Infrastructure;
using Cowork.Api.Modules.Rooms.Application.Ports;
using Cowork.Api.Modules.Rooms.Contracts;
using Cowork.Api.Modules.Rooms.Domain;
using Microsoft.EntityFrameworkCore;

namespace Cowork.Api.Modules.Rooms.Infrastructure;

public sealed class PostgresRoomRepository(CoworkDbContext db) : IRoomRepository
{
    public async Task AddAsync(Room room, CancellationToken cancellationToken)
    {
        db.Rooms.Add(room);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class PostgresRoomQueries(CoworkDbContext db) : IRoomQueries
{
    public async Task<IReadOnlyList<RoomSummary>> ListAsync(CancellationToken cancellationToken) =>
        await db
            .Rooms.OrderBy(room => room.Name)
            .Select(room => new RoomSummary(room.Id, room.Name, room.Capacity))
            .ToArrayAsync(cancellationToken);

    public async Task<RoomSummary?> FindAsync(Guid roomId, CancellationToken cancellationToken) =>
        await db
            .Rooms.Where(room => room.Id == roomId)
            .Select(room => new RoomSummary(room.Id, room.Name, room.Capacity))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, string>> FindNamesAsync(
        IReadOnlyCollection<Guid> roomIds,
        CancellationToken cancellationToken
    ) =>
        await db
            .Rooms.Where(room => roomIds.Contains(room.Id))
            .Select(room => new RoomSummary(room.Id, room.Name, room.Capacity))
            .ToDictionaryAsync(summary => summary.Id, summary => summary.Name, cancellationToken);
}
