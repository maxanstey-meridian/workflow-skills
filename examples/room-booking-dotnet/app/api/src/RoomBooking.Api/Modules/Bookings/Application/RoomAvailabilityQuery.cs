using Microsoft.Extensions.Options;
using RoomBooking.Api.Modules.Bookings.Application.Ports;

namespace RoomBooking.Api.Modules.Bookings.Application;

public sealed record IntervalDto(DateTimeOffset Start, DateTimeOffset End);

public sealed record AvailabilityResult(
    Guid RoomId,
    DateOnly Date,
    IReadOnlyList<IntervalDto> Busy
);

/// <summary>
///     What is already held of a room on a zone-local day: the half-open [Start, HeldUntil) of
///     every active booking overlapping that day, earliest first. A booking holds its tail
///     [HeldUntil, End) only once checked in, so that part stays free for others.
/// </summary>
public sealed class RoomAvailabilityQuery(
    IBookingFinder bookings,
    IOptions<BookingSchedulingOptions> scheduling
)
{
    public async Task<AvailabilityResult> ExecuteAsync(
        Guid roomId,
        DateOnly date,
        CancellationToken cancellationToken
    )
    {
        var zone = ZoneTime.Zone(scheduling.Value.TimeZoneId);
        var from = ZoneTime.UtcAt(date, TimeOnly.MinValue, zone);
        var to = ZoneTime.UtcAt(date.AddDays(1), TimeOnly.MinValue, zone);
        var overlapping = await bookings.ListActiveOverlappingAsync(
            roomId,
            from,
            to,
            cancellationToken
        );
        return new AvailabilityResult(
            roomId,
            date,
            overlapping
                .Select(booking => new IntervalDto(booking.Start, booking.HeldUntil))
                .ToList()
        );
    }
}
