using Cowork.Api.Common;
using Rivet;

namespace Cowork.Api.Contracts.Bookings;

[RivetContract]
public static class BookingsContract
{
    public const string BaseRoute = "api/bookings";
    public const string CancelRoute = "api/bookings/{id:guid}/cancel";
    public const string CheckInRoute = "api/bookings/{id:guid}/check-in";
    public const string RoomDayRoute = "api/rooms/{roomId:guid}/day";

    public static readonly RouteDefinition<BookRoomRequest, BookingResponse> Book = Define
        .Post<BookRoomRequest, BookingResponse>("/api/bookings")
        .Status(201)
        .Description("Book a room for a time slot.")
        .Returns<ErrorResponse>(422, "Validation failed")
        .Returns<ErrorResponse>(404, "Room not found")
        .Returns<ErrorResponse>(409, "The room is already held at overlapping times");

    public static readonly RouteDefinition<IReadOnlyList<BookingResponse>> ListMine = Define
        .Get<IReadOnlyList<BookingResponse>>("/api/bookings")
        .Description("The caller's bookings, soonest first.")
        .Returns<ErrorResponse>(500, "Unexpected failure");

    public static readonly RouteDefinition<BookingResponse> Cancel = Define
        .Post<BookingResponse>("/api/bookings/{id:guid}/cancel")
        .Description("Cancel one of the caller's bookings before it starts.")
        .Status(200)
        .Returns<ErrorResponse>(404, "Booking not found")
        .Returns<ErrorResponse>(409, "The booking cannot be cancelled");

    public static readonly RouteDefinition<BookingResponse> CheckIn = Define
        .Post<BookingResponse>("/api/bookings/{id:guid}/check-in")
        .Description("Check in to one of the caller's bookings.")
        .Status(200)
        .Returns<ErrorResponse>(404, "Booking not found")
        .Returns<ErrorResponse>(409, "The booking cannot be checked in");

    public static readonly RouteDefinition<RoomDayRequest, RoomDayResponse> RoomDay = Define
        .Get<RoomDayRequest, RoomDayResponse>("/api/rooms/{roomId:guid}/day")
        .Description("The holds one room already has on one day, so a free slot can be picked.")
        .Returns<ErrorResponse>(404, "Room not found");
}
