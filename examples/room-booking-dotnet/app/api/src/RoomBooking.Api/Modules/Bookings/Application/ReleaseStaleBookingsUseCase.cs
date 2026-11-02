using RoomBooking.Api.Modules.Bookings.Application.Ports;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
///     Releases every Booked booking whose hold has lapsed. The sweep cadence lives in
///     <c>ReleaseSweeper</c>; this is the one decision, owned by the repository's atomic UPDATE.
/// </summary>
public sealed class ReleaseStaleBookingsUseCase(IBookingRepository bookings, TimeProvider clock)
{
    public async Task<int> ExecuteAsync(CancellationToken cancellationToken)
    {
        return await bookings.ReleaseDueAsync(clock.GetUtcNow(), cancellationToken);
    }
}
