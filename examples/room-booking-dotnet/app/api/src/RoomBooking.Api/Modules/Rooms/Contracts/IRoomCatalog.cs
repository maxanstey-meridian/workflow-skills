namespace RoomBooking.Api.Modules.Rooms.Contracts;

public sealed record RoomSummary(Guid Id, string Name, int Capacity);

public interface IRoomCatalog
{
    public Task<RoomSummary?> FindAsync(Guid roomId, CancellationToken cancellationToken);
}
