namespace Cowork.Api.Contracts.Bookings;

public sealed record BookRoomRequest(Guid RoomId, DateTimeOffset StartsAt, DateTimeOffset EndsAt);

public sealed record BookingActionResponse(string Action, bool Enabled, string? Reason);

public sealed record BookingResponse(
    Guid Id,
    Guid RoomId,
    string RoomName,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string Status,
    IReadOnlyList<BookingActionResponse> AvailableActions
);

public sealed record RoomDayRequest(Guid RoomId, DateOnly Date);

public sealed record RoomHoldResponse(
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string Status
);

public sealed record RoomDayResponse(
    Guid RoomId,
    DateOnly Date,
    IReadOnlyList<RoomHoldResponse> Holds
);
