using FluentResults;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

public sealed class CheckInBookingUseCase(
    IBookingRepository bookings,
    IRoomDirectory rooms,
    TimeProvider clock
)
{
    public async Task<Result<BookingRow>> ExecuteAsync(
        CheckInBookingCommand command,
        CancellationToken cancellationToken
    )
    {
        var now = clock.GetUtcNow();
        for (var attempt = 0; ; attempt++)
        {
            var booking = await bookings.FindAsync(command.BookingId, cancellationToken);
            if (booking is null)
            {
                return BookingFailures.NotFound();
            }

            if (booking.MemberId != command.ActorId)
            {
                return BookingFailures.Forbidden();
            }

            var refusal = BookingLifecycle.Refusal(booking.Snapshot(), BookingAction.CheckIn, now);
            if (refusal is { } decided)
            {
                return Result.Fail<BookingRow>(
                    BookingRefusals.ToDeclaredError(decided, booking.Status)
                );
            }

            booking.CheckIn(now);
            try
            {
                await bookings.SaveAsync(cancellationToken);
                var room = await rooms.FindAsync(booking.RoomId, cancellationToken);
                return Result.Ok(BookingRow.From(booking, room, now));
            }
            catch (BookingStaleException) when (attempt < 2)
            {
                // Someone moved this booking first; the adapter discarded the write, so the next
                // pass loads their state and decides against it.
            }
            catch (BookingConflictException)
            {
                // The room's freed tail was rebooked while this member had not checked in; the
                // overlap constraint refused the extended hold. Retrying would collide again.
                return Result.Fail<BookingRow>(
                    new DeclaredError(
                        "ROOM_NO_LONGER_HELD",
                        "Someone booked the rest of your slot while you were not checked in."
                    )
                );
            }
        }
    }
}

public sealed record CheckInBookingCommand(Guid ActorId, Guid BookingId);
