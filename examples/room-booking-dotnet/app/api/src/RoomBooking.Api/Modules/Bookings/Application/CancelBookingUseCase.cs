using FluentResults;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

public sealed class CancelBookingUseCase(
    IBookingRepository bookings,
    IRoomDirectory rooms,
    TimeProvider clock
)
{
    public async Task<Result<BookingRow>> ExecuteAsync(
        CancelBookingCommand command,
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

            var refusal = BookingLifecycle.Refusal(booking.Snapshot(), BookingAction.Cancel, now);
            if (refusal is { } decided)
            {
                return Result.Fail<BookingRow>(
                    BookingRefusals.ToDeclaredError(decided, booking.Status)
                );
            }

            booking.Cancel();
            try
            {
                await bookings.SaveAsync(cancellationToken);
                var room = await rooms.FindAsync(booking.RoomId, cancellationToken);
                return Result.Ok(BookingRow.From(booking, room, now));
            }
            catch (BookingStaleException) when (attempt < 2)
            {
                // Someone moved this booking first; the adapter discarded the write, so the next
                // pass loads their state and decides against it. A third lost race surfaces as an
                // undeclared 5xx, which is honest for something that cannot practically happen.
            }
        }
    }
}

public sealed record CancelBookingCommand(Guid ActorId, Guid BookingId);
