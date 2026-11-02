namespace RoomBooking.Api.Modules.Rooms.Application.Ports;

public interface IRoomFinder
{
    public Task<IReadOnlyList<RoomRow>> ListAsync(CancellationToken cancellationToken);
}
