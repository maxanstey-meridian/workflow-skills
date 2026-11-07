using FluentResults;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rivet;
using RoomBooking.Api.Auth;
using RoomBooking.Api.Contracts.Booking;
using RoomBooking.Api.Contracts.Shared;
using RoomBooking.Api.Modules.Bookings.Application;
using RoomBooking.Api.Modules.Bookings.Application.Ports;

namespace RoomBooking.Api.Modules.Bookings;

[ApiController]
[Authorize]
public sealed class BookingController(
    AddRoom addRoom,
    ListRooms listRooms,
    ListRoomAvailability listAvailability,
    BookRoom bookRoom,
    CancelBooking cancelBooking,
    CheckInBooking checkInBooking,
    ListMyBookings listMyBookings,
    IValidator<AddRoomRequest> addRoomValidator,
    IValidator<BookRoomRequest> bookRoomValidator
) : ControllerBase
{
    [HttpGet("/" + BookingContract.ListRoomsRoute)]
    public async Task<IActionResult> ListRooms(CancellationToken ct)
    {
        var endpoint = BookingContract.ListRooms;
        var rooms = await listRooms.ExecuteAsync(ct);
        return endpoint
            .Success(new RoomsResponse([.. rooms.Rooms.Select(ToView)]))
            .ToActionResult();
    }

    [HttpPost("/" + BookingContract.AddRoomRoute)]
    [Authorize(Policy = AuthorizationPolicies.StaffOnly)]
    public async Task<IActionResult> AddRoom(
        [FromBody] AddRoomRequest request,
        CancellationToken ct
    )
    {
        var endpoint = BookingContract.AddRoom.Bind(request);
        var invalid = await ValidateAsync(addRoomValidator, request, ct);
        if (invalid is not null)
        {
            return endpoint.Error(422, invalid).ToActionResult();
        }

        var actor = this.RequireActor();
        if (actor is null)
        {
            return endpoint
                .Error(403, new ErrorResponse("forbidden", "The acting user is not known."))
                .ToActionResult();
        }

        var result = await addRoom.ExecuteAsync(request.Name, request.Capacity, actor, ct);
        return result switch
        {
            { IsSuccess: true } => endpoint
                .Success(ToView(result.Value.RoomId, request.Name.Trim(), request.Capacity))
                .ToActionResult(),
            _ => MapFailure(endpoint.Error, result),
        };
    }

    [HttpGet("/" + BookingContract.ListAvailabilityRoute)]
    public async Task<IActionResult> ListAvailability(
        [FromQuery] AvailabilityRequest request,
        CancellationToken ct
    )
    {
        var endpoint = BookingContract.ListAvailability.Bind(request);
        var availability = await listAvailability.ExecuteAsync(
            request.StartUtc.UtcDateTime,
            request.EndUtc.UtcDateTime,
            ct
        );
        return endpoint
            .Success(
                new AvailabilityResponse([
                    .. availability.Rooms.Select(r => new RoomAvailabilityView(
                        r.RoomId,
                        r.Name,
                        r.Capacity,
                        r.IsAvailable
                    )),
                ])
            )
            .ToActionResult();
    }

    [HttpGet("/" + BookingContract.ListBookingsRoute)]
    [Authorize(Policy = AuthorizationPolicies.MembersOnly)]
    public async Task<IActionResult> ListBookings(CancellationToken ct)
    {
        var endpoint = BookingContract.ListBookings;
        var actor = this.RequireActor();
        if (actor is null)
        {
            return endpoint
                .Error(403, new ErrorResponse("forbidden", "The acting user is not known."))
                .ToActionResult();
        }

        var bookings = await listMyBookings.ExecuteAsync(actor.Id, ct);
        return endpoint
            .Success(new BookingsResponse([.. bookings.Bookings.Select(ToView)]))
            .ToActionResult();
    }

    [HttpPost("/" + BookingContract.CreateBookingRoute)]
    [Authorize(Policy = AuthorizationPolicies.MembersOnly)]
    public async Task<IActionResult> CreateBooking(
        [FromBody] BookRoomRequest request,
        CancellationToken ct
    )
    {
        var endpoint = BookingContract.CreateBooking.Bind(request);
        var invalid = await ValidateAsync(bookRoomValidator, request, ct);
        if (invalid is not null)
        {
            return endpoint.Error(422, invalid).ToActionResult();
        }

        var actor = this.RequireActor();
        if (actor is null)
        {
            return endpoint
                .Error(403, new ErrorResponse("forbidden", "The acting user is not known."))
                .ToActionResult();
        }

        var result = await bookRoom.ExecuteAsync(
            request.RoomId,
            request.StartUtc.UtcDateTime,
            request.EndUtc.UtcDateTime,
            actor,
            ct
        );
        return result switch
        {
            { IsSuccess: true } => endpoint.Success(ToView(result.Value)).ToActionResult(),
            _ => MapFailure(endpoint.Error, result),
        };
    }

    [HttpPost("/" + BookingContract.CancelBookingRoute)]
    [Authorize(Policy = AuthorizationPolicies.MembersOnly)]
    public async Task<IActionResult> CancelBooking(Guid id, CancellationToken ct)
    {
        var actor = this.RequireActor();
        if (actor is null)
        {
            return BookingContract
                .CancelBooking.Error(
                    403,
                    new ErrorResponse("forbidden", "The acting user is not known.")
                )
                .ToActionResult();
        }

        var result = await cancelBooking.ExecuteAsync(id, actor, ct);
        return result switch
        {
            { IsSuccess: true } => BookingContract
                .CancelBooking.Success(ToView(result.Value))
                .ToActionResult(),
            _ => MapFailure(BookingContract.CancelBooking.Error, result),
        };
    }

    [HttpPost("/" + BookingContract.CheckInBookingRoute)]
    [Authorize(Policy = AuthorizationPolicies.MembersOnly)]
    public async Task<IActionResult> CheckInBooking(Guid id, CancellationToken ct)
    {
        var actor = this.RequireActor();
        if (actor is null)
        {
            return BookingContract
                .CheckInBooking.Error(
                    403,
                    new ErrorResponse("forbidden", "The acting user is not known.")
                )
                .ToActionResult();
        }

        var result = await checkInBooking.ExecuteAsync(id, actor, ct);
        return result switch
        {
            { IsSuccess: true } => BookingContract
                .CheckInBooking.Success(ToView(result.Value))
                .ToActionResult(),
            _ => MapFailure(BookingContract.CheckInBooking.Error, result),
        };
    }

    /// <summary>Maps the use case's one declared failure through the contract's declared response.</summary>
    private static IActionResult MapFailure<TSuccess>(
        Func<int, ErrorResponse, RivetResult> error,
        Result<TSuccess> result
    )
    {
        var failure = result.SoleFailure();
        return error(failure.Status.HttpStatus(), new ErrorResponse(failure.Code, failure.Message))
            .ToActionResult();
    }

    /// <summary>Request-shape validation stays at the transport edge; the envelope and codes come from the validator.</summary>
    private static async Task<ErrorResponse?> ValidateAsync<TRequest>(
        IValidator<TRequest> validator,
        TRequest request,
        CancellationToken ct
    )
        where TRequest : class
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (validation.IsValid)
        {
            return null;
        }

        var errors = validation
            .Errors.GroupBy(e => e.PropertyName)
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
        return new ErrorResponse("validation_failed", "The request is invalid.", errors);
    }

    private static RoomView ToView(RoomRow row) => new(row.Id, row.Name, row.Capacity);

    private static RoomView ToView(Guid id, string name, int capacity) => new(id, name, capacity);

    private static BookingView ToView(BookingProjection booking) =>
        new(
            booking.Id,
            booking.RoomId,
            booking.RoomName,
            new DateTimeOffset(DateTime.SpecifyKind(booking.StartUtc, DateTimeKind.Utc)),
            new DateTimeOffset(DateTime.SpecifyKind(booking.EndUtc, DateTimeKind.Utc)),
            (BookingStatusWire)booking.Status,
            [.. booking.AvailableActions.Select(a => (BookingActionWire)a)]
        );
}
