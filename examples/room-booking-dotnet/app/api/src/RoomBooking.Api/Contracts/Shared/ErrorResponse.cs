namespace RoomBooking.Api.Contracts.Shared;

/// <summary>The one error envelope for every declared failure; the frontend matches on Code.</summary>
public sealed record ErrorResponse(
    string Code,
    string Message,
    IReadOnlyDictionary<string, string[]>? Errors = null
);
