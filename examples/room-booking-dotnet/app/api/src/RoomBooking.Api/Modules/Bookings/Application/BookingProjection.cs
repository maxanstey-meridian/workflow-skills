using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
/// Read model for one booking. The server's answer about what may happen
/// travels with it: availableActions is computed by the same decider the use
/// cases guard with, so no caller re-derives the rule.
/// </summary>
public sealed record BookingProjection(
    Guid Id,
    Guid RoomId,
    string RoomName,
    DateTime StartUtc,
    DateTime EndUtc,
    BookingStatus Status,
    IReadOnlyList<BookingAction> AvailableActions
)
{
    public static BookingProjection From(BookingRow row, DateTime now) =>
        new(
            row.Id,
            row.RoomId,
            row.RoomName,
            row.StartUtc,
            row.EndUtc,
            row.Status,
            BookingLifecycle.Available(new BookingState(row.Status, row.StartUtc), now)
        );
}
