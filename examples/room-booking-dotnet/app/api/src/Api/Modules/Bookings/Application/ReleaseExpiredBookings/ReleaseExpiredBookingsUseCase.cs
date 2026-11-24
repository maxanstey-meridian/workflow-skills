using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Modules.Bookings.Application.ReleaseExpiredBookings;

public sealed record ReleaseExpiredBookingsResult(int ReleasedCount);

public sealed class ReleaseExpiredBookingsUseCase(BookingRepository bookings, TimeProvider time)
{
    public async Task<ReleaseExpiredBookingsResult> ExecuteAsync(
        CancellationToken cancellationToken
    )
    {
        var cutoff = time.GetUtcNow() - BookingLifecycle.CheckInWindow;
        var released = await bookings.ReleaseExpiredAsync(cutoff, cancellationToken);
        return new ReleaseExpiredBookingsResult(released);
    }
}
