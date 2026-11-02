using System.Text.Json.Serialization;
using Rivet;

namespace RoomBooking.Api.Contracts.Bookings;

[JsonConverter(typeof(RivetCamelCaseEnumConverter<BookingStatus>))]
public enum BookingStatus
{
    Booked,
    CheckedIn,
    Cancelled,
    Released,
}

[JsonConverter(typeof(RivetCamelCaseEnumConverter<BookingAction>))]
public enum BookingAction
{
    Cancel,
    CheckIn,
}

public sealed record BookingDto(
    Guid Id,
    Guid RoomId,
    string RoomName,
    DateTimeOffset Start,
    DateTimeOffset End,
    BookingStatus Status,
    DateTimeOffset? CheckInAt,
    DateTimeOffset? CheckInClosesAt,
    IReadOnlyList<BookingAction> AvailableActions
);

public sealed record MyBookingsResponse(IReadOnlyList<BookingDto> Bookings);

public sealed record CreateBookingRequest(Guid RoomId, DateTimeOffset Start, DateTimeOffset End);

/// <summary>Lowered to the route token on the cancel and check-in routes.</summary>
public sealed record BookingPath(Guid Id);

public sealed record AvailabilityInterval(DateTimeOffset Start, DateTimeOffset End);

/// <summary>Lowered to the route token and the query parameter on GET availability.</summary>
public sealed record AvailabilityQuery(Guid RoomId, DateOnly Date);

public sealed record AvailabilityResponse(
    Guid RoomId,
    DateOnly Date,
    IReadOnlyList<AvailabilityInterval> Busy
);
