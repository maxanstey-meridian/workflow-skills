using System.Diagnostics;
using System.Security.Claims;
using FluentResults;
using Rivet;
using RoomBooking.Api.Common;
using RoomBooking.Api.Contracts.Bookings;
using RoomBooking.Api.Modules.Bookings.Application;

namespace RoomBooking.Api.Modules.Bookings;

public static class BookingsEndpoints
{
    public static IEndpointRouteBuilder MapBookingsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost(
                BookingsContract.Create.Route,
                async (
                    CreateBookingRequest request,
                    ClaimsPrincipal principal,
                    BookRoomUseCase bookRoom,
                    CancellationToken cancellationToken
                ) =>
                {
                    var endpoint = BookingsContract.Create.Bind(request);
                    var actorId = ActorId(principal);
                    var command = new BookRoomCommand(
                        actorId,
                        request.RoomId,
                        request.Start,
                        request.End
                    );
                    var result = await bookRoom.ExecuteAsync(command, cancellationToken);
                    if (result.IsSuccess)
                    {
                        return endpoint.Success(ToDto(result.Value)).ToResult();
                    }

                    var failure = result.Errors.OfType<DeclaredError>().Single();
                    return endpoint.Error(StatusFor(failure), ToErrorResponse(failure)).ToResult();
                }
            )
            .RequireAuthorization("Member");

        app.MapGet(
                BookingsContract.Mine.Route,
                async (
                    ClaimsPrincipal principal,
                    MyBookingsQuery mine,
                    CancellationToken cancellationToken
                ) =>
                {
                    var endpoint = BookingsContract.Mine;
                    var rows = await mine.ExecuteAsync(ActorId(principal), cancellationToken);
                    return endpoint
                        .Success(new MyBookingsResponse(rows.Select(ToDto).ToList()))
                        .ToResult();
                }
            )
            .RequireAuthorization("Member");

        app.MapPost(
                BookingsContract.Cancel.Route,
                async (
                    Guid id,
                    ClaimsPrincipal principal,
                    CancelBookingUseCase cancel,
                    CancellationToken cancellationToken
                ) =>
                {
                    var endpoint = BookingsContract.Cancel.Bind(new BookingPath(id));
                    var result = await cancel.ExecuteAsync(
                        new CancelBookingCommand(ActorId(principal), id),
                        cancellationToken
                    );
                    if (result.IsSuccess)
                    {
                        return endpoint.Success(ToDto(result.Value)).ToResult();
                    }

                    var failure = result.Errors.OfType<DeclaredError>().Single();
                    return endpoint.Error(StatusFor(failure), ToErrorResponse(failure)).ToResult();
                }
            )
            .RequireAuthorization("Member");

        app.MapPost(
                BookingsContract.CheckIn.Route,
                async (
                    Guid id,
                    ClaimsPrincipal principal,
                    CheckInBookingUseCase checkIn,
                    CancellationToken cancellationToken
                ) =>
                {
                    var endpoint = BookingsContract.CheckIn.Bind(new BookingPath(id));
                    var result = await checkIn.ExecuteAsync(
                        new CheckInBookingCommand(ActorId(principal), id),
                        cancellationToken
                    );
                    if (result.IsSuccess)
                    {
                        return endpoint.Success(ToDto(result.Value)).ToResult();
                    }

                    var failure = result.Errors.OfType<DeclaredError>().Single();
                    return endpoint.Error(StatusFor(failure), ToErrorResponse(failure)).ToResult();
                }
            )
            .RequireAuthorization("Member");

        app.MapGet(
                BookingsContract.Availability.Route,
                async (
                    Guid roomId,
                    DateOnly date,
                    RoomAvailabilityQuery availability,
                    CancellationToken cancellationToken
                ) =>
                {
                    var endpoint = BookingsContract.Availability.Bind(
                        new AvailabilityQuery(roomId, date)
                    );
                    var result = await availability.ExecuteAsync(roomId, date, cancellationToken);
                    return endpoint
                        .Success(
                            new AvailabilityResponse(
                                result.RoomId,
                                result.Date,
                                result
                                    .Busy.Select(interval => new AvailabilityInterval(
                                        interval.Start,
                                        interval.End
                                    ))
                                    .ToList()
                            )
                        )
                        .ToResult();
                }
            )
            .RequireAuthorization("Authenticated");

        return app;
    }

    private static Guid ActorId(ClaimsPrincipal principal)
    {
        return Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }

    private static int StatusFor(DeclaredError error)
    {
        return error.Code switch
        {
            "ROOM_ALREADY_BOOKED"
            or "ALREADY_CANCELLED"
            or "ALREADY_RELEASED"
            or "ALREADY_CHECKED_IN"
            or "ALREADY_ENDED"
            or "CHECK_IN_NOT_OPEN"
            or "CHECK_IN_WINDOW_CLOSED"
            or "ROOM_NO_LONGER_HELD" => StatusCodes.Status409Conflict,
            "VALIDATION_FAILED" or "END_BEFORE_START" or "START_IN_PAST" or "UNKNOWN_ROOM" =>
                StatusCodes.Status422UnprocessableEntity,
            "FORBIDDEN" => StatusCodes.Status403Forbidden,
            "BOOKING_NOT_FOUND" => StatusCodes.Status404NotFound,
            _ => throw new UnreachableException(
                $"No declared status for error code '{error.Code}'."
            ),
        };
    }

    private static ErrorResponse ToErrorResponse(DeclaredError error)
    {
        return new ErrorResponse(error.Code, error.Message, error.ValidationErrors);
    }

    private static BookingDto ToDto(BookingRow row)
    {
        return new BookingDto(
            row.Id,
            row.RoomId,
            row.RoomName,
            row.Start,
            row.End,
            MapStatus(row.Status),
            row.CheckInAt,
            row.CheckInClosesAt,
            row.AvailableActions.Select(MapAction).ToList()
        );
    }

    private static Contracts.Bookings.BookingStatus MapStatus(Domain.BookingStatus status)
    {
        return status switch
        {
            Domain.BookingStatus.Booked => Contracts.Bookings.BookingStatus.Booked,
            Domain.BookingStatus.CheckedIn => Contracts.Bookings.BookingStatus.CheckedIn,
            Domain.BookingStatus.Cancelled => Contracts.Bookings.BookingStatus.Cancelled,
            Domain.BookingStatus.Released => Contracts.Bookings.BookingStatus.Released,
            _ => throw new UnreachableException($"Unhandled booking status '{status}'."),
        };
    }

    private static Contracts.Bookings.BookingAction MapAction(Domain.BookingAction action)
    {
        return action switch
        {
            Domain.BookingAction.Cancel => Contracts.Bookings.BookingAction.Cancel,
            Domain.BookingAction.CheckIn => Contracts.Bookings.BookingAction.CheckIn,
            _ => throw new UnreachableException($"Unhandled booking action '{action}'."),
        };
    }
}
