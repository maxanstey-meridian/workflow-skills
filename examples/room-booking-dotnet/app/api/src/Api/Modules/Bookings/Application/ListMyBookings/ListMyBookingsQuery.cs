using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Modules.Rooms.Contracts;

namespace Cowork.Api.Modules.Bookings.Application.ListMyBookings;

public sealed record MyBookingView(
    Guid Id,
    Guid RoomId,
    string RoomName,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    BookingStatus Status,
    IReadOnlyList<BookingAction> AvailableActions
);

public sealed class ListMyBookingsQuery(BookingRepository bookings, RoomDirectory rooms)
{
    public async Task<IReadOnlyList<MyBookingView>> ExecuteAsync(
        string memberEmail,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        var rows = await bookings.ListForMemberAsync(memberEmail, cancellationToken);
        var roomNames = (await rooms.AllAsync(cancellationToken)).ToDictionary(
            r => r.Id,
            r => r.Name
        );
        return
        [
            .. rows.OrderByDescending(b => b.StartsAt)
                .Select(b => new MyBookingView(
                    b.Id,
                    b.RoomId,
                    roomNames.GetValueOrDefault(b.RoomId, "Unknown room"),
                    b.StartsAt,
                    b.EndsAt,
                    b.Status,
                    BookingLifecycle.Available(b, now)
                )),
        ];
    }
}
