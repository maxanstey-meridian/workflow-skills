using RoomBooking.Api.Modules.Bookings.Domain;
using RoomBooking.Api.Modules.Rooms.Contracts;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
///     The read-model row every booking write and read projects to. <c>availableActions</c> and
///     <c>checkInClosesAt</c> are derived here, from the decider and the one clock, so no caller
///     re-derives the lifecycle.
/// </summary>
public sealed record BookingRow(
    Guid Id,
    Guid RoomId,
    string RoomName,
    DateTimeOffset Start,
    DateTimeOffset End,
    BookingStatus Status,
    DateTimeOffset? CheckInAt,
    DateTimeOffset? CheckInClosesAt,
    IReadOnlyList<BookingAction> AvailableActions
)
{
    /// <summary>
    ///     Projects a booking for the member to see. A vanished room keeps rendering (rooms are
    ///     never deleted through the API, so this only guards against a stray row); the name
    ///     falls back to empty.
    /// </summary>
    public static BookingRow From(Booking booking, RoomSummary? room, DateTimeOffset now)
    {
        return new BookingRow(
            booking.Id,
            booking.RoomId,
            room?.Name ?? string.Empty,
            booking.Start,
            booking.End,
            booking.Status,
            booking.CheckInAt,
            booking.Status == BookingStatus.Booked
                ? booking.Start + BookingRules.CheckInGrace
                : null,
            BookingLifecycle.Available(booking.Snapshot(), now)
        );
    }
}
