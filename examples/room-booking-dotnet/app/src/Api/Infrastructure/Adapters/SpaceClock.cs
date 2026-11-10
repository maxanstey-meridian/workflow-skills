using Cowork.Api.Modules.Bookings.Application.Ports;
using Microsoft.Extensions.Options;

namespace Cowork.Api.Infrastructure.Adapters;

/// <summary>
/// The space's clock, answering day and evening questions in the space's time zone.
/// All time comes from the one injected TimeProvider, so a test that fixes the clock
/// fixes every comparison.
/// </summary>
public sealed class SpaceClock(TimeProvider timeProvider, IOptions<SpaceOptions> options)
    : ISpaceClock
{
    private readonly TimeZoneInfo zone = TimeZoneInfo.FindSystemTimeZoneById(
        options.Value.TimeZoneId
    );

    public DateTimeOffset Now => timeProvider.GetUtcNow();

    public DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(Now, zone).Date);

    public TimeZoneInfo Zone => zone;

    public (DateTimeOffset Start, DateTimeOffset End) DayRange(DateOnly date)
    {
        var startLocal = new DateTimeOffset(
            date.ToDateTime(TimeOnly.MinValue),
            zone.GetUtcOffset(new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue)))
        );
        return (startLocal, startLocal.AddDays(1));
    }
}
