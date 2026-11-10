using Cowork.Api.Modules.Bookings.Domain;
using FluentResults;

namespace Cowork.Api.Modules.Bookings.Application.Bookings;

/// <summary>
/// Maps a decider refusal to the declared failure in one place: the refusal code becomes
/// the API error code and the refusal reason becomes its message.
/// </summary>
public static class BookingErrors
{
    public static Error FromRefusal(BookingDecision decision) =>
        new Error(decision.Reason).WithMetadata("code", decision.RefusalCode);

    public static Error NotFound() =>
        new Error("Booking not found").WithMetadata("code", "booking_not_found");

    public static Error RoomNotFound() =>
        new Error("Room not found").WithMetadata("code", "room_not_found");

    public static Error RoomAlreadyHeld() =>
        new Error("That room is already booked at overlapping times").WithMetadata(
            "code",
            "room_already_booked"
        );

    public static Error InThePast() =>
        new Error("A booking must start in the future").WithMetadata("code", "booking_in_past");
}
