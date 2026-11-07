using RoomBooking.Api.Modules.Bookings.Application;

namespace RoomBooking.Api.Sweeping;

/// <summary>
/// Releases stale bookings on a timer. Release is time-critical, user-visible
/// work: a missed booking's room should become rebookable promptly, so this
/// runs at one-minute granularity rather than off-peak.
/// </summary>
public sealed class ReleaseSweeper(
    IServiceScopeFactory scopes,
    TimeProvider clock,
    ILogger<ReleaseSweeper> logger
) : BackgroundService
{
    private static readonly TimeSpan Every = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Every);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var release = scope.ServiceProvider.GetRequiredService<ReleaseStaleBookings>();
                var released = await release.ExecuteAsync(
                    clock.GetUtcNow().UtcDateTime,
                    stoppingToken
                );
                if (released > 0)
                {
                    logger.LogInformation("Release sweep freed {Count} booking(s)", released);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Release sweep failed");
            }
        }
    }
}

/// <summary>
/// Sends reminder emails on a timer. The window the use case enforces (the
/// evening before a booking, spread by booking id) lives in
/// SendBookingReminders alongside the rule; this service only beats time.
/// </summary>
public sealed class ReminderSweeper(
    IServiceScopeFactory scopes,
    TimeProvider clock,
    IConfiguration configuration,
    ILogger<ReminderSweeper> logger
) : BackgroundService
{
    private static readonly TimeSpan Every = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var zone = FindBusinessZone(configuration);
        using var timer = new PeriodicTimer(Every);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var reminders = scope.ServiceProvider.GetRequiredService<SendBookingReminders>();
                var sent = await reminders.ExecuteAsync(
                    clock.GetUtcNow().UtcDateTime,
                    zone,
                    stoppingToken
                );
                if (sent > 0)
                {
                    logger.LogInformation("Reminder sweep sent {Count} email(s)", sent);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Reminder sweep failed");
            }
        }
    }

    private static TimeZoneInfo FindBusinessZone(IConfiguration configuration)
    {
        // The zone the space's members live in decides when "the evening before"
        // is. Default to the host's zone; override with Scheduling:BusinessTimeZone.
        var configured = configuration["Scheduling:BusinessTimeZone"];
        return configured is null
            ? TimeZoneInfo.Local
            : TimeZoneInfo.FindSystemTimeZoneById(configured);
    }
}
