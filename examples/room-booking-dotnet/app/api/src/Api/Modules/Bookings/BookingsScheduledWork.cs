using Cowork.Api.Modules.Bookings.Application.ReleaseExpiredBookings;
using Cowork.Api.Modules.Bookings.Application.SendBookingReminders;
using Microsoft.Extensions.Options;

namespace Cowork.Api.Modules.Bookings;

/// <summary>
/// Releases bookings that were never checked in, and sends the evening-before
/// reminder emails. Both read the one injected clock.
/// </summary>
public sealed class ReleaseExpiredBookingsWorker(
    IServiceScopeFactory scopes,
    TimeProvider time,
    ILogger<ReleaseExpiredBookingsWorker> logger
) : BackgroundService
{
    /// <summary>
    /// Sweep every 30 seconds so a booking is released within half a minute
    /// of its check-in window closing.
    /// </summary>
    private static readonly TimeSpan _sweepInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_sweepInterval, time);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();
                var release =
                    scope.ServiceProvider.GetRequiredService<ReleaseExpiredBookingsUseCase>();
                var result = await release.ExecuteAsync(stoppingToken);
                if (result.ReleasedCount > 0)
                {
                    logger.LogInformation(
                        "Released {Count} booking(s) that were not checked in",
                        result.ReleasedCount
                    );
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "The expired-booking sweep failed");
            }
        }
    }
}

public sealed class BookingReminderWorker(
    IServiceScopeFactory scopes,
    TimeProvider time,
    IOptions<ReminderOptions> options,
    ILogger<BookingReminderWorker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(options.Value.TimeZoneId);
        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = TimeUntilNextEvening(
                time.GetUtcNow(),
                timeZone,
                options.Value.EveningHourLocal
            );
            await Task.Delay(delay, time, stoppingToken);
            try
            {
                using var scope = scopes.CreateScope();
                var sendReminders =
                    scope.ServiceProvider.GetRequiredService<SendBookingRemindersUseCase>();
                var result = await sendReminders.ExecuteAsync(stoppingToken);
                if (result.SentCount > 0)
                {
                    logger.LogInformation(
                        "Sent {Count} booking reminder email(s)",
                        result.SentCount
                    );
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Sending booking reminders failed");
            }
        }
    }

    /// <summary>Delay until the next run of the evening reminder hour in the space's time zone.</summary>
    internal static TimeSpan TimeUntilNextEvening(
        DateTimeOffset nowUtc,
        TimeZoneInfo timeZone,
        int eveningHourLocal
    )
    {
        var nowLocal = TimeZoneInfo.ConvertTime(nowUtc, timeZone);
        var nextRunLocal = nowLocal.Date.AddHours(eveningHourLocal);
        if (nextRunLocal <= nowLocal)
        {
            nextRunLocal = nextRunLocal.AddDays(1);
        }

        return TimeZoneInfo.ConvertTimeToUtc(
                DateTime.SpecifyKind(nextRunLocal, DateTimeKind.Unspecified),
                timeZone
            ) - nowUtc;
    }
}
