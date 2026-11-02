using Rivet;
using RoomBooking.Api.Common;

namespace RoomBooking.Api.Contracts.Bookings;

[RivetContract]
public static class BookingsContract
{
    public const string CreateRoute = "/api/bookings";

    public const string MineRoute = "/api/bookings/mine";

    public const string CancelRoute = "/api/bookings/{id:guid}/cancel";

    public const string CheckInRoute = "/api/bookings/{id:guid}/check-in";

    public const string AvailabilityRoute = "/api/rooms/{roomId:guid}/availability";

    public static readonly RouteDefinition<CreateBookingRequest, BookingDto> Create = Define
        .Post<CreateBookingRequest, BookingDto>(CreateRoute)
        .Description(
            "Book a room for a time slot. The hold lasts until the slot ends, but expires 15 "
                + "minutes after the start unless the booking is checked in."
        )
        .Returns<ErrorResponse>(409, "The room is already held at overlapping times.")
        .Returns<ErrorResponse>(422, "The booking details are invalid.")
        .Returns(403, "Only members can book rooms.");

    public static readonly RouteDefinition<MyBookingsResponse> Mine = Define
        .Get<MyBookingsResponse>(MineRoute)
        .Description("The acting member's bookings, newest slot first, with what each allows now.");

    public static readonly RouteDefinition<BookingPath, BookingDto> Cancel = Define
        .Post<BookingPath, BookingDto>(CancelRoute)
        .Status(200)
        .Description("Cancel a booking you own.")
        .Returns<ErrorResponse>(403, "The booking belongs to someone else.")
        .Returns<ErrorResponse>(404, "No such booking.")
        .Returns<ErrorResponse>(409, "The booking cannot be cancelled right now.");

    public static readonly RouteDefinition<BookingPath, BookingDto> CheckIn = Define
        .Post<BookingPath, BookingDto>(CheckInRoute)
        .Status(200)
        .Description("Check in to a booking you own, from its start until 15 minutes after.")
        .Returns<ErrorResponse>(403, "The booking belongs to someone else.")
        .Returns<ErrorResponse>(404, "No such booking.")
        .Returns<ErrorResponse>(409, "The booking cannot be checked in right now.");

    public static readonly RouteDefinition<AvailabilityQuery, AvailabilityResponse> Availability =
        Define
            .Get<AvailabilityQuery, AvailabilityResponse>(AvailabilityRoute)
            .Description("What is already held of a room on a day, in the booking zone.");
}
