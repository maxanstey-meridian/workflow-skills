using RoomBooking.Api.Modules.Bookings.Application.Ports;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>The acting member's bookings, newest slot first, with what each one allows right now.</summary>
public sealed class MyBookingsQuery(
    IBookingFinder bookings,
    IRoomDirectory rooms,
    TimeProvider clock
)
{
    public async Task<IReadOnlyList<BookingRow>> ExecuteAsync(
        Guid memberId,
        CancellationToken cancellationToken
    )
    {
        var rows = await bookings.ListForMemberAsync(memberId, cancellationToken);
        var now = clock.GetUtcNow();
        var projected = new List<BookingRow>(rows.Count);
        foreach (var booking in rows)
        {
            var room = await rooms.FindAsync(booking.RoomId, cancellationToken);
            projected.Add(BookingRow.From(booking, room, now));
        }

        return projected;
    }
}
