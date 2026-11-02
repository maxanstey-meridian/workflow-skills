using Microsoft.Extensions.Options;
using RoomBooking.Api.Modules.Bookings.Application;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure.Scheduling;

/// <summary>
///     Sends booking reminders every evening at the configured wall time (18:30 in the members'
///     zone): people read them the evening before a booking, off-peak. On start it runs once,
///     to catch up on an evening the host missed, then sleeps to the next instant and repeats.
///     <see cref="RunOnceAsync" /> is the loop body, public so tests can drive it with their
///     own clock.
/// </summary>
public sealed class ReminderSweeper(
    IServiceScopeFactory scopes,
    IOptions<BookingSchedulingOptions> scheduling,
    TimeProvider clock,
    ILogger<ReminderSweeper> logger
) : BackgroundService
{
    public async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopes.CreateAsyncScope();
        var reminders = scope.ServiceProvider.GetRequiredService<SendDueBookingRemindersUseCase>();
        await reminders.ExecuteAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!scheduling.Value.Enabled)
        {
            return;
        }

        var zone = ZoneTime.Zone(scheduling.Value.TimeZoneId);
        try
        {
            await RunOnceAsync(stoppingToken);
            while (!stoppingToken.IsCancellationRequested)
            {
                var now = clock.GetUtcNow();
                var next = NextSweepAt(
                    now,
                    zone,
                    scheduling.Value.ReminderAtHour,
                    scheduling.Value.ReminderAtMinute
                );
                await Task.Delay(next - now, clock, stoppingToken);
                await RunOnceAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Stopping: normal.
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "The reminder sweep stopped.");
        }
    }

    /// <summary>The next wall-clock reminder instant: today's if it is still ahead, else tomorrow's.</summary>
    internal static DateTimeOffset NextSweepAt(
        DateTimeOffset now,
        TimeZoneInfo zone,
        int hour,
        int minute
    )
    {
        var today = ZoneTime.LocalDate(now, zone);
        var todaySweep = ZoneTime.UtcAt(today, new TimeOnly(hour, minute), zone);
        return todaySweep > now
            ? todaySweep
            : ZoneTime.UtcAt(today.AddDays(1), new TimeOnly(hour, minute), zone);
    }
}
