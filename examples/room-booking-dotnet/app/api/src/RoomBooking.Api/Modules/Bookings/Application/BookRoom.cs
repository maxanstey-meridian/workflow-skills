using System.Diagnostics;
using FluentResults;
using RoomBooking.Api.Kernel;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

public sealed class BookRoom(IBookingRepository bookings, IRoomQueries rooms, TimeProvider clock)
{
    public async Task<Result<BookingProjection>> ExecuteAsync(
        Guid roomId,
        DateTime startUtc,
        DateTime endUtc,
        Actor actor,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow().UtcDateTime;
        if (startUtc < now)
        {
            return Result.Fail<BookingProjection>(
                new AppError(
                    "booking_start_in_past",
                    "The booking must start in the future.",
                    FailureStatus.Validation
                )
            );
        }

        if (endUtc <= startUtc)
        {
            return Result.Fail<BookingProjection>(
                new AppError(
                    "booking_slot_inverted",
                    "The booking must end after it starts.",
                    FailureStatus.Validation
                )
            );
        }

        var room = await rooms.GetByIdAsync(roomId, ct);
        if (room is null)
        {
            return Result.Fail<BookingProjection>(
                new AppError("room_not_found", "The room does not exist.", FailureStatus.NotFound)
            );
        }

        var booking = new Booking(
            Guid.CreateVersion7(),
            roomId,
            actor.Id,
            actor.Email,
            startUtc,
            endUtc,
            now
        );
        var outcome = await bookings.AddAsync(booking, ct);
        return outcome switch
        {
            BookingPersistOutcome.Persisted => Result.Ok(
                BookingProjection.From(
                    new BookingRow(
                        booking.Id,
                        roomId,
                        room.Name,
                        actor.Id,
                        actor.Email,
                        startUtc,
                        endUtc,
                        booking.Status,
                        null
                    ),
                    now
                )
            ),
            BookingPersistOutcome.RoomOverlapped => Result.Fail<BookingProjection>(
                new AppError(
                    "booking_room_overlapped",
                    "This room is already booked for part of that time.",
                    FailureStatus.Conflict
                )
            ),
            BookingPersistOutcome.RoomMissing => Result.Fail<BookingProjection>(
                new AppError("room_not_found", "The room does not exist.", FailureStatus.NotFound)
            ),
            _ => throw new UnreachableException($"{outcome} has no failure mapping"),
        };
    }
}
