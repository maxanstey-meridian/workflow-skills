using Rivet;
using RoomBooking.Api.Contracts.Shared;

namespace RoomBooking.Api.Contracts.Booking;

[RivetContract]
public static class BookingContract
{
    public const string ListRoomsRoute = "/api/rooms";
    public const string AddRoomRoute = "/api/rooms";
    public const string ListAvailabilityRoute = "/api/rooms/availability";
    public const string ListBookingsRoute = "/api/bookings";
    public const string CreateBookingRoute = "/api/bookings";
    public const string CancelBookingRoute = "/api/bookings/{id:guid}/cancel";
    public const string CheckInBookingRoute = "/api/bookings/{id:guid}/check-in";

    public static readonly RouteDefinition<RoomsResponse> ListRooms = Define.Get<RoomsResponse>(
        ListRoomsRoute
    );

    public static readonly RouteDefinition<AddRoomRequest, RoomView> AddRoom = Define
        .Post<AddRoomRequest, RoomView>(AddRoomRoute)
        .Status(201)
        .Returns<ErrorResponse>(422, "The request is invalid")
        .Returns<ErrorResponse>(403, "Only staff can add rooms")
        .Returns<ErrorResponse>(409, "A room with this name already exists");

    public static readonly RouteDefinition<
        AvailabilityRequest,
        AvailabilityResponse
    > ListAvailability = Define
        .Get<AvailabilityRequest, AvailabilityResponse>(ListAvailabilityRoute)
        .Returns<ErrorResponse>(422, "The request is invalid");

    public static readonly RouteDefinition<BookingsResponse> ListBookings = Define
        .Get<BookingsResponse>(ListBookingsRoute)
        .Returns<ErrorResponse>(403, "Only members list their bookings");

    public static readonly RouteDefinition<BookRoomRequest, BookingView> CreateBooking = Define
        .Post<BookRoomRequest, BookingView>(CreateBookingRoute)
        .Status(201)
        .Returns<ErrorResponse>(422, "The request is invalid")
        .Returns<ErrorResponse>(403, "Only members can book")
        .Returns<ErrorResponse>(404, "The room does not exist")
        .Returns<ErrorResponse>(409, "The booking was refused");

    public static readonly RouteDefinition<BookingView> CancelBooking = Define
        .Post<BookingView>(CancelBookingRoute)
        .Status(200)
        .Returns<ErrorResponse>(404, "The booking does not exist")
        .Returns<ErrorResponse>(403, "Not the member's booking")
        .Returns<ErrorResponse>(409, "The booking was refused");

    public static readonly RouteDefinition<BookingView> CheckInBooking = Define
        .Post<BookingView>(CheckInBookingRoute)
        .Status(200)
        .Returns<ErrorResponse>(404, "The booking does not exist")
        .Returns<ErrorResponse>(403, "Not the member's booking")
        .Returns<ErrorResponse>(409, "The booking was refused");
}
