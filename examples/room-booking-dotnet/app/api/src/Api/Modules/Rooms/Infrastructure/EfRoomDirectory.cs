using Cowork.Api.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cowork.Api.Modules.Rooms.Infrastructure;

/// <summary>Implements Rooms' published <see cref="Contracts.RoomDirectory"/> contract over the rooms table.</summary>
public sealed class EfRoomDirectory(CoworkDbContext db) : Contracts.RoomDirectory
{
    public async Task<bool> ExistsAsync(Guid roomId, CancellationToken cancellationToken) =>
        await db.Rooms.AnyAsync(r => r.Id == roomId, cancellationToken);

    public async Task<IReadOnlyList<Contracts.RoomSummary>> AllAsync(
        CancellationToken cancellationToken
    ) =>
        await db
            .Rooms.OrderBy(r => r.Name)
            .Select(r => new Contracts.RoomSummary(r.Id, r.Name, r.Capacity))
            .ToListAsync(cancellationToken);
}
