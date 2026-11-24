using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;
using FluentResults;

namespace Cowork.Api.Modules.Bookings.Application.CancelBooking;

public sealed record CancelBookingCommand(Guid BookingId, string MemberEmail);

public sealed class CancelBookingUseCase(BookingRepository bookings, TimeProvider time)
{
    public async Task<Result<BookingUpdatedResult>> ExecuteAsync(
        CancelBookingCommand command,
        CancellationToken cancellationToken
    )
    {
        var booking = await bookings.FindForMemberAsync(
            command.BookingId,
            command.MemberEmail,
            cancellationToken
        );
        if (booking is null)
        {
            return Result.Fail<BookingUpdatedResult>(BookingErrors.NotFound);
        }

        if (
            BookingLifecycle.Refusal(booking, BookingAction.Cancel, time.GetUtcNow()) is { } refusal
        )
        {
            return Result.Fail<BookingUpdatedResult>(BookingFailures.From(refusal));
        }

        // The conditional write decides; a booking cancelled in a concurrent
        // request leaves zero rows updated, which reads as "no longer active".
        var updated = await bookings.TransitionAsync(
            booking.Id,
            BookingStatus.Booked,
            BookingStatus.Cancelled,
            cancellationToken
        );
        return updated
            ? Result.Ok(new BookingUpdatedResult(booking.Id, BookingStatus.Cancelled))
            : Result.Fail<BookingUpdatedResult>(
                BookingFailures.From(BookingRefusal.AlreadySettled)
            );
    }
}
