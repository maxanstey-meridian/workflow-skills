using Cowork.Api.Modules.Bookings.Application.Bookings;
using Cowork.Api.Modules.Bookings.Application.Ports;

namespace Cowork.Api.Modules.Bookings.Application.ListMyBookings;

/// <summary>The member's bookings, soonest first.</summary>
public sealed class ListMyBookingsQuery(
    IBookingRepository bookings,
    IRoomDirectory rooms,
    ISpaceClock clock,
    ICurrentMember currentMember
)
{
    public async Task<IReadOnlyList<BookingView>> ExecuteAsync(CancellationToken cancellationToken)
    {
        var myBookings = await bookings.ListForMemberAsync(
            currentMember.MemberId,
            cancellationToken
        );
        var names = await rooms.FindNamesAsync(
            myBookings.Select(booking => booking.RoomId).ToArray(),
            cancellationToken
        );
        return myBookings
            .Select(booking =>
                BookingViewAssembler.For(
                    booking,
                    names.GetValueOrDefault(booking.RoomId, string.Empty),
                    clock.Now
                )
            )
            .ToArray();
    }
}
