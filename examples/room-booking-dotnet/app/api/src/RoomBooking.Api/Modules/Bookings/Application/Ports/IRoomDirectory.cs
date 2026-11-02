using RoomBooking.Api.Modules.Rooms.Contracts;

namespace RoomBooking.Api.Modules.Bookings.Application.Ports;

/// <summary>
///     Bookings' required port onto the Rooms module (consumer-owned, per the module doctrine).
///     The host bridges it to the Rooms module's published <c>IRoomCatalog</c>.
/// </summary>
public interface IRoomDirectory
{
    public Task<RoomSummary?> FindAsync(Guid roomId, CancellationToken cancellationToken);
}
