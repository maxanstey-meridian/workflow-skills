using System.Text.Json.Serialization;
using Rivet;

namespace RoomBooking.Api.Contracts.Booking;

[JsonConverter(typeof(RivetKebabCaseEnumConverter<BookingStatusWire>))]
public enum BookingStatusWire
{
    Booked,
    CheckedIn,
    Cancelled,
    Released,
}

[JsonConverter(typeof(RivetKebabCaseEnumConverter<BookingActionWire>))]
public enum BookingActionWire
{
    CheckIn,
    Cancel,
}

public sealed record RoomView(Guid Id, string Name, int Capacity);

public sealed record RoomsResponse(IReadOnlyList<RoomView> Rooms);

public sealed record AddRoomRequest(string Name, int Capacity);

public sealed record AvailabilityRequest(DateTimeOffset StartUtc, DateTimeOffset EndUtc);

public sealed record RoomAvailabilityView(Guid RoomId, string Name, int Capacity, bool IsAvailable);

public sealed record AvailabilityResponse(IReadOnlyList<RoomAvailabilityView> Rooms);

public sealed record BookRoomRequest(Guid RoomId, DateTimeOffset StartUtc, DateTimeOffset EndUtc);

public sealed record BookingView(
    Guid Id,
    Guid RoomId,
    string RoomName,
    DateTimeOffset StartUtc,
    DateTimeOffset EndUtc,
    BookingStatusWire Status,
    IReadOnlyList<BookingActionWire> AvailableActions
);

public sealed record BookingsResponse(IReadOnlyList<BookingView> Bookings);
