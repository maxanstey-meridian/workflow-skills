namespace Cowork.Api.Modules.Rooms.Contracts;

/// <summary>
/// Rooms' published contract: what other modules may ask about rooms.
/// Bookings could not keep its rules (a booking references an existing room;
/// its read models name the room) without this.
/// </summary>
public interface RoomDirectory
{
    public Task<bool> ExistsAsync(Guid roomId, CancellationToken cancellationToken);
    public Task<IReadOnlyList<RoomSummary>> AllAsync(CancellationToken cancellationToken);
}

public sealed record RoomSummary(Guid Id, string Name, int Capacity);
