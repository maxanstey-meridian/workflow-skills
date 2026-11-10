using Cowork.Api.Modules.Bookings.Application.Ports;

namespace Cowork.Api.Modules.Bookings.Application.ReleaseExpired;

/// <summary>
/// Releases every booked hold that is past its release deadline. The repository query is
/// the SQL copy of the decider's release rule; each transition still goes through the
/// booking, so a row the query returned wrongly can never be released against the rules.
/// </summary>
public sealed class ReleaseExpiredBookingsUseCase(
    IBookingRepository bookings,
    ISpaceClock clock,
    ILogger<ReleaseExpiredBookingsUseCase> logger
)
{
    public async Task<int> ExecuteAsync(CancellationToken cancellationToken)
    {
        var now = clock.Now;
        var expired = await bookings.ListExpiredAsync(now, cancellationToken);
        var released = 0;
        foreach (var booking in expired)
        {
            var decision = booking.Release(now);
            if (decision.Allowed)
            {
                released += 1;
            }
            else
            {
                logger.LogWarning(
                    "Release sweep loaded booking {BookingId} that the decider refuses to release: {Reason}",
                    booking.Id,
                    decision.Reason
                );
            }
        }

        if (released > 0)
        {
            await bookings.SaveAsync(cancellationToken);
        }

        return released;
    }
}
