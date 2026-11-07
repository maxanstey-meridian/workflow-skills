using System.Diagnostics;
using FluentResults;
using RoomBooking.Api.Kernel;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
/// A member acts on their own booking. The decider guards the action; the
/// repository's atomic conditional write then arbitrates against any race (for
/// example the release sweep running between the guard and the write), and a
/// lost write is re-read and explained by the same decider.
/// </summary>
public abstract class BookingActionUseCase
{
    private readonly IBookingRepository _bookings;
    private readonly IBookingQueries _queries;
    private readonly TimeProvider _clock;

    protected BookingActionUseCase(
        IBookingRepository bookings,
        IBookingQueries queries,
        TimeProvider clock,
        BookingAction action
    )
    {
        _bookings = bookings;
        _queries = queries;
        _clock = clock;
        Action = action;
    }

    protected BookingAction Action { get; }

    public async Task<Result<BookingProjection>> ExecuteAsync(
        Guid bookingId,
        Actor actor,
        CancellationToken ct
    )
    {
        var row = await _queries.GetByIdAsync(bookingId, ct);
        if (row is null)
        {
            return Result.Fail<BookingProjection>(
                new AppError(
                    "booking_not_found",
                    "The booking does not exist.",
                    FailureStatus.NotFound
                )
            );
        }

        if (row.MemberId != actor.Id)
        {
            return Result.Fail<BookingProjection>(
                new AppError(
                    "booking_not_yours",
                    "Only the member who holds a booking can act on it.",
                    FailureStatus.Forbidden
                )
            );
        }

        var now = _clock.GetUtcNow().UtcDateTime;
        var refusal = BookingLifecycle.Refusal(
            new BookingState(row.Status, row.StartUtc),
            Action,
            now
        );
        if (refusal is not null)
        {
            return Result.Fail<BookingProjection>(BookingRefusalMapping.ToFailure(refusal.Value));
        }

        if (!await WriteAsync(bookingId, ct))
        {
            // A concurrent writer (the release sweep, or another action) got there
            // first; the same decider now explains the new state.
            var latest = await _queries.GetByIdAsync(bookingId, ct);
            if (latest is not null)
            {
                var raced = BookingLifecycle.Refusal(
                    new BookingState(latest.Status, latest.StartUtc),
                    Action,
                    now
                );
                if (raced is not null)
                {
                    return Result.Fail<BookingProjection>(
                        BookingRefusalMapping.ToFailure(raced.Value)
                    );
                }
            }

            throw new UnreachableException(
                $"The conditional write for {Action} failed but the decider accepts the action"
            );
        }

        var updated = (await _queries.GetByIdAsync(bookingId, ct))!;
        return Result.Ok(BookingProjection.From(updated, _clock.GetUtcNow().UtcDateTime));
    }

    private Task<bool> WriteAsync(Guid bookingId, CancellationToken ct) =>
        Action switch
        {
            BookingAction.CheckIn => _bookings.TryCheckInAsync(bookingId, ct),
            BookingAction.Cancel => _bookings.TryCancelAsync(bookingId, ct),
            _ => throw new UnreachableException($"{Action} has no conditional write"),
        };
}

/// <summary>A member checks in to their own booking within the check-in window.</summary>
public sealed class CheckInBooking(
    IBookingRepository bookings,
    IBookingQueries queries,
    TimeProvider clock
) : BookingActionUseCase(bookings, queries, clock, BookingAction.CheckIn);

/// <summary>A member cancels their own booking before it starts.</summary>
public sealed class CancelBooking(
    IBookingRepository bookings,
    IBookingQueries queries,
    TimeProvider clock
) : BookingActionUseCase(bookings, queries, clock, BookingAction.Cancel);
