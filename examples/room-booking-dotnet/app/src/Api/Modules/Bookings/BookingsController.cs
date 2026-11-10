using Cowork.Api.Common;
using Cowork.Api.Contracts.Bookings;
using Cowork.Api.Modules.Bookings.Application.Bookings;
using Cowork.Api.Modules.Bookings.Application.BookRoom;
using Cowork.Api.Modules.Bookings.Application.CancelBooking;
using Cowork.Api.Modules.Bookings.Application.CheckIn;
using Cowork.Api.Modules.Bookings.Application.ListMyBookings;
using Cowork.Api.Modules.Bookings.Application.ListRoomDay;
using FluentResults;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rivet;

namespace Cowork.Api.Modules.Bookings;

[ApiController]
[Authorize]
public sealed class BookingsController(
    BookRoomUseCase bookRoom,
    CancelBookingUseCase cancelBooking,
    CheckInBookingUseCase checkInBooking,
    ListMyBookingsQuery listMyBookings,
    ListRoomDayQuery listRoomDay,
    BookRoomRequestValidator validator
) : ControllerBase
{
    [HttpGet(BookingsContract.BaseRoute)]
    public async Task<IActionResult> ListMine(CancellationToken cancellationToken)
    {
        var bookings = await listMyBookings.ExecuteAsync(cancellationToken);
        return BookingsContract
            .ListMine.Success(bookings.Select(BookingsTransportMapper.ToResponse).ToArray())
            .ToActionResult();
    }

    [HttpPost(BookingsContract.BaseRoute)]
    public async Task<IActionResult> Book(
        [FromBody] BookRoomRequest request,
        CancellationToken cancellationToken
    )
    {
        var endpoint = BookingsContract.Book.Bind(request);

        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return endpoint.Error(422, Envelope(validation)).ToActionResult();
        }

        var result = await bookRoom.ExecuteAsync(
            new BookRoomCommand(request.RoomId, request.StartsAt, request.EndsAt),
            cancellationToken
        );
        return result.IsSuccess
            ? endpoint.Success(BookingsTransportMapper.ToResponse(result.Value)).ToActionResult()
            : Declared(endpoint, result);
    }

    [HttpPost(BookingsContract.CancelRoute)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken cancellationToken)
    {
        var result = await cancelBooking.ExecuteAsync(
            new CancelBookingCommand(id),
            cancellationToken
        );
        return result.IsSuccess
            ? BookingsContract
                .Cancel.Success(BookingsTransportMapper.ToResponse(result.Value))
                .ToActionResult()
            : Declared(BookingsContract.Cancel, result);
    }

    [HttpPost(BookingsContract.CheckInRoute)]
    public async Task<IActionResult> CheckIn(Guid id, CancellationToken cancellationToken)
    {
        var result = await checkInBooking.ExecuteAsync(new CheckInCommand(id), cancellationToken);
        return result.IsSuccess
            ? BookingsContract
                .CheckIn.Success(BookingsTransportMapper.ToResponse(result.Value))
                .ToActionResult()
            : Declared(BookingsContract.CheckIn, result);
    }

    [HttpGet(BookingsContract.RoomDayRoute)]
    public async Task<IActionResult> RoomDay(
        Guid roomId,
        [FromQuery] DateOnly date,
        CancellationToken cancellationToken
    )
    {
        var endpoint = BookingsContract.RoomDay.Bind(new RoomDayRequest(roomId, date));

        var result = await listRoomDay.ExecuteAsync(
            new ListRoomDayCommand(roomId, date),
            cancellationToken
        );
        if (result.IsSuccess)
        {
            var view = result.Value;
            var holds = view
                .Holds.Select(hold => new RoomHoldResponse(hold.StartsAt, hold.EndsAt, hold.Status))
                .ToArray();
            return endpoint.Success(new RoomDayResponse(roomId, view.Date, holds)).ToActionResult();
        }

        return Declared(endpoint, result);
    }

    // The declared-failure arm: the envelope is built once at the edge, from the error code
    // the use case returned.
    private static IActionResult Declared(
        RouteDefinition<BookingResponse> endpoint,
        Result<BookingView> result
    ) =>
        endpoint
            .Error(ErrorHttpMapping.ToStatus(result), ErrorHttpMapping.ToEnvelope(result))
            .ToActionResult();

    private static IActionResult Declared(
        Rivet.BoundRouteDefinition<RoomDayResponse> endpoint,
        Result<RoomDayView> result
    ) =>
        endpoint
            .Error(ErrorHttpMapping.ToStatus(result), ErrorHttpMapping.ToEnvelope(result))
            .ToActionResult();

    private static IActionResult Declared(
        Rivet.BoundRouteDefinition<BookingResponse> endpoint,
        Result<BookingView> result
    ) =>
        endpoint
            .Error(ErrorHttpMapping.ToStatus(result), ErrorHttpMapping.ToEnvelope(result))
            .ToActionResult();

    private static ErrorResponse Envelope(FluentValidation.Results.ValidationResult validation) =>
        new(
            ErrorHttpMapping.ValidationCode,
            "Validation failed",
            validation
                .Errors.GroupBy(failure => failure.PropertyName)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(failure => failure.ErrorMessage).ToArray()
                )
        );
}
