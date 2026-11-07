using RoomBooking.Api.Modules.Bookings.Application.Ports;

namespace RoomBooking.Api.Modules.Bookings.Application;

public sealed record RoomAvailabilityOutcome(IReadOnlyList<RoomAvailabilityRow> Rooms);

/// <summary>Which rooms can hold the half-open slot [startUtc, endUtc).</summary>
public sealed class ListRoomAvailability(IRoomQueries rooms)
{
    public async Task<RoomAvailabilityOutcome> ExecuteAsync(
        DateTime startUtc,
        DateTime endUtc,
        CancellationToken ct
    ) => new(await rooms.ListForSlotAsync(startUtc, endUtc, ct));
}
