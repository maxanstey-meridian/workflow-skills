using System.Text.Json.Serialization;
using Rivet;

namespace Cowork.Api.Contracts.Bookings;

[JsonConverter(typeof(RivetCamelCaseEnumConverter<BookingStatusValue>))]
public enum BookingStatusValue
{
    Booked,
    CheckedIn,
    Cancelled,
    Released,
}

[JsonConverter(typeof(RivetCamelCaseEnumConverter<BookingActionValue>))]
public enum BookingActionValue
{
    Cancel,
    CheckIn,
}

public sealed record BookRoomRequest(Guid RoomId, DateTimeOffset StartsAt, DateTimeOffset EndsAt);

public sealed record BookRoomResponse(Guid Id);

public sealed record BookingResponse(
    Guid Id,
    Guid RoomId,
    string RoomName,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    BookingStatusValue Status,
    IReadOnlyList<BookingActionValue> AvailableActions
);

public sealed record MyBookingsResponse(IReadOnlyList<BookingResponse> Bookings);

public sealed record BookingStateResponse(Guid Id, BookingStatusValue Status);

public sealed record AvailableRoomsRequest(DateTimeOffset StartsAt, DateTimeOffset EndsAt);

public sealed record AvailableRoomResponse(Guid Id, string Name, int Capacity);

public sealed record AvailableRoomsResponse(IReadOnlyList<AvailableRoomResponse> Rooms);
