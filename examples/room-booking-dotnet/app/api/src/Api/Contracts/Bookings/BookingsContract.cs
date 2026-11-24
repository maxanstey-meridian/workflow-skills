using Cowork.Api.Common;
using Rivet;

namespace Cowork.Api.Contracts.Bookings;

[RivetContract]
public static class BookingsContract
{
    public static readonly RouteDefinition<BookRoomRequest, BookRoomResponse> Book = Define
        .Post<BookRoomRequest, BookRoomResponse>("/api/bookings")
        .Summary("Book a room")
        .Description("A member books a room for a time slot.")
        .Returns<ErrorResponse>(422, "Validation failed")
        .Returns<ErrorResponse>(404, "Room not found")
        .Returns<ErrorResponse>(409, "The room is already booked for an overlapping time");

    public static readonly RouteDefinition<MyBookingsResponse> ListMine = Define
        .Get<MyBookingsResponse>("/api/bookings/mine")
        .Summary("List my bookings")
        .Description("The signed-in member's bookings, each with the actions still open to them.");

    public static readonly RouteDefinition<BookingStateResponse> Cancel = Define
        .Post<BookingStateResponse>("/api/bookings/{id:guid}/cancel")
        .Summary("Cancel my booking")
        .Status(200)
        .Returns<ErrorResponse>(404, "Booking not found")
        .Returns<ErrorResponse>(409, "The booking can no longer be cancelled");

    public static readonly RouteDefinition<BookingStateResponse> CheckIn = Define
        .Post<BookingStateResponse>("/api/bookings/{id:guid}/check-in")
        .Summary("Check in to my booking")
        .Description("Check-in opens when the booking starts and closes 15 minutes later.")
        .Status(200)
        .Returns<ErrorResponse>(404, "Booking not found")
        .Returns<ErrorResponse>(409, "Check-in is not open");

    public static readonly RouteDefinition<
        AvailableRoomsRequest,
        AvailableRoomsResponse
    > AvailableRooms = Define
        .Get<AvailableRoomsRequest, AvailableRoomsResponse>("/api/rooms/available")
        .Summary("List rooms free for a slot")
        .Description("Rooms with no active booking overlapping the given time slot.");
}
