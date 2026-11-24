using Cowork.Api.Modules.Bookings.Application.Ports;
using Cowork.Api.Modules.Bookings.Domain;
using FluentResults;

namespace Cowork.Api.Modules.Bookings.Application.CheckInBooking;

public sealed record CheckInBookingCommand(Guid BookingId, string MemberEmail);

public sealed class CheckInBookingUseCase(BookingRepository bookings, TimeProvider time)
{
    public async Task<Result<BookingUpdatedResult>> ExecuteAsync(
        CheckInBookingCommand command,
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
            BookingLifecycle.Refusal(booking, BookingAction.CheckIn, time.GetUtcNow()) is
            { } refusal
        )
        {
            return Result.Fail<BookingUpdatedResult>(BookingFailures.From(refusal));
        }

        // The conditional write decides; a booking released or checked in by
        // the sweep or a concurrent request leaves zero rows updated.
        var updated = await bookings.TransitionAsync(
            booking.Id,
            BookingStatus.Booked,
            BookingStatus.CheckedIn,
            cancellationToken
        );
        return updated
            ? Result.Ok(new BookingUpdatedResult(booking.Id, BookingStatus.CheckedIn))
            : Result.Fail<BookingUpdatedResult>(
                BookingFailures.From(BookingRefusal.AlreadySettled)
            );
    }
}
