using Cowork.Api.Modules.Bookings.Application.Bookings;
using Cowork.Api.Modules.Bookings.Application.Ports;
using FluentResults;

namespace Cowork.Api.Modules.Bookings.Application.ListRoomDay;

/// <summary>The holds one room already has on one day, so a member can pick a free slot.</summary>
public sealed record RoomDayView(DateOnly Date, IReadOnlyList<RoomHoldView> Holds);

public sealed record RoomHoldView(DateTimeOffset StartsAt, DateTimeOffset EndsAt, string Status);

public sealed record ListRoomDayCommand(Guid RoomId, DateOnly Date);

public sealed class ListRoomDayQuery(
    IBookingRepository bookings,
    IRoomDirectory rooms,
    ISpaceClock clock
)
{
    public async Task<Result<RoomDayView>> ExecuteAsync(
        ListRoomDayCommand command,
        CancellationToken cancellationToken
    )
    {
        var room = await rooms.FindAsync(command.RoomId, cancellationToken);
        if (room is null)
        {
            return Result.Fail(BookingErrors.RoomNotFound());
        }

        var (from, to) = clock.DayRange(command.Date);
        var holds = await bookings.ListHoldsAsync(command.RoomId, from, to, cancellationToken);
        return Result.Ok(
            new RoomDayView(
                command.Date,
                holds
                    .Select(booking => new RoomHoldView(
                        booking.StartsAt,
                        booking.EndsAt,
                        booking.Status.ToString()
                    ))
                    .ToArray()
            )
        );
    }
}
