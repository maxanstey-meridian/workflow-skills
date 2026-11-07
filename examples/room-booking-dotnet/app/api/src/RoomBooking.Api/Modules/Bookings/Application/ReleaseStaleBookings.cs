using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
/// Releases bookings whose check-in window has closed. The repository's single
/// conditional update is the atomic write; stale state cannot resurrect a
/// released booking. Returns the number released.
/// </summary>
public sealed class ReleaseStaleBookings(IBookingRepository bookings)
{
    public async Task<int> ExecuteAsync(DateTime nowUtc, CancellationToken ct)
    {
        var cutoff = nowUtc - BookingLifecycle.CheckInGrace;
        return await bookings.ReleaseStaleAsync(cutoff, ct);
    }
}
