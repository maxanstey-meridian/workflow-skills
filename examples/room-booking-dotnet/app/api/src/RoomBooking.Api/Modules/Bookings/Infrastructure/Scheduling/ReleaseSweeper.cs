using Microsoft.Extensions.Options;
using RoomBooking.Api.Modules.Bookings.Application;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure.Scheduling;

/// <summary>
///     Releases expired holds every 30 seconds. The deadline sweep must run well inside the
///     15-minute check-in grace (<see cref="RoomBooking.Api.Modules.Bookings.Domain.BookingRules" />),
///     so a room freed by a no-show becomes bookable promptly and the head of the slot does not
///     stay blocked for long after the hold lapses.
/// </summary>
public sealed class ReleaseSweeper(
    IServiceScopeFactory scopes,
    IOptions<BookingSchedulingOptions> scheduling,
    TimeProvider clock,
    ILogger<ReleaseSweeper> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!scheduling.Value.Enabled)
        {
            return;
        }

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30), clock);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var release =
                        scope.ServiceProvider.GetRequiredService<ReleaseStaleBookingsUseCase>();
                    var released = await release.ExecuteAsync(stoppingToken);
                    if (released > 0)
                    {
                        logger.LogInformation("Released {Count} stale booking(s).", released);
                    }
                }
                catch (OperationCanceledException)
                {
                    throw;
                }
                catch (Exception exception)
                {
                    // One failed sweep must not take the host down; the next tick retries.
                    logger.LogError(exception, "The release sweep failed.");
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Stopping: normal.
        }
    }
}
