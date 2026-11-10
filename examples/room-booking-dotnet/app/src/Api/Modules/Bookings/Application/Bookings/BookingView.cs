using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Modules.Bookings.Application.Bookings;

/// <summary>The read model one booking is returned on. The server decides which actions are
/// open and why; the client never re-derives the rule.</summary>
public sealed record BookingView(
    Guid Id,
    Guid RoomId,
    string RoomName,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    BookingStatus Status,
    IReadOnlyList<BookingActionView> AvailableActions
);

public sealed record BookingActionView(BookingAction Action, bool Enabled, string? Reason);

/// <summary>Assembles booking views, quoting the decider for availableActions.</summary>
public static class BookingViewAssembler
{
    public static BookingView For(Booking booking, string roomName, DateTimeOffset now) =>
        new(
            booking.Id,
            booking.RoomId,
            roomName,
            booking.StartsAt,
            booking.EndsAt,
            booking.Status,
            BookingDecider
                .AvailableActions(booking.State(), now)
                .Select(entry => new BookingActionView(
                    entry.Action,
                    entry.Decision.Allowed,
                    entry.Decision.Allowed ? null : entry.Decision.Reason
                ))
                .ToArray()
        );
}
