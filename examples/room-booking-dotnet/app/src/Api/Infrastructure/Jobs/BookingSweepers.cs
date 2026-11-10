using Cowork.Api.Modules.Bookings.Application.ReleaseExpired;
using Cowork.Api.Modules.Bookings.Application.SendReminders;

namespace Cowork.Api.Infrastructure.Jobs;

/// <summary>
/// Releases bookings that were not checked in within their grace window.
/// Runs every minute so a released room is bookable again within a minute of the deadline.
/// </summary>
public sealed class BookingReleaseSweeper(
    IServiceScopeFactory scopeFactory,
    ILogger<BookingReleaseSweeper> logger
) : BackgroundService
{
    private static readonly TimeSpan ReleaseCheckInterval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(ReleaseCheckInterval);
        while (
            !stoppingToken.IsCancellationRequested
            && await timer.WaitForNextTickAsync(stoppingToken)
        )
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var useCase =
                    scope.ServiceProvider.GetRequiredService<ReleaseExpiredBookingsUseCase>();
                var released = await useCase.ExecuteAsync(stoppingToken);
                if (released > 0)
                {
                    logger.LogInformation("Release sweep released {Count} booking(s)", released);
                }
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Release sweep failed; it will retry on the next tick");
            }
        }
    }
}

/// <summary>
/// Sends evening-before reminder emails. Ticks every five minutes so a failed send is
/// retried soon; the reminder rule itself only fires at or after the reminder hour on
/// the evening before each booking.
/// </summary>
public sealed class BookingReminderDispatcher(
    IServiceScopeFactory scopeFactory,
    ILogger<BookingReminderDispatcher> logger
) : BackgroundService
{
    private static readonly TimeSpan ReminderCheckInterval = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(ReminderCheckInterval);
        while (
            !stoppingToken.IsCancellationRequested
            && await timer.WaitForNextTickAsync(stoppingToken)
        )
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var useCase =
                    scope.ServiceProvider.GetRequiredService<SendBookingRemindersUseCase>();
                await useCase.ExecuteAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(
                    exception,
                    "Reminder dispatch failed; it will retry on the next tick"
                );
            }
        }
    }
}
