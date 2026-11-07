using RoomBooking.Api.Modules.Bookings.Application.Ports;

namespace RoomBooking.Api.Modules.Bookings.Application;

public sealed record MyBookingsOutcome(IReadOnlyList<BookingProjection> Bookings);

public sealed class ListMyBookings(IBookingQueries queries, TimeProvider clock)
{
    public async Task<MyBookingsOutcome> ExecuteAsync(Guid memberId, CancellationToken ct)
    {
        var rows = await queries.ListForMemberAsync(memberId, ct);
        var now = clock.GetUtcNow().UtcDateTime;
        return new MyBookingsOutcome([
            .. rows.Select(r => BookingProjection.From(r, now)).OrderBy(b => b.StartUtc),
        ]);
    }
}
