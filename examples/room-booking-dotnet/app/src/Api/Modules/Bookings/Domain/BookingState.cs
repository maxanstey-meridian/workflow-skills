namespace Cowork.Api.Modules.Bookings.Domain;

/// <summary>The facts a decision needs, with no I/O.</summary>
public readonly record struct BookingState(
    BookingStatus Status,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt
);
