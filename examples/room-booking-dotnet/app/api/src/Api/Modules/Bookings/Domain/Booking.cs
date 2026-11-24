namespace Cowork.Api.Modules.Bookings.Domain;

public sealed class Booking
{
    public required Guid Id { get; init; }
    public required Guid RoomId { get; init; }
    public required string MemberEmail { get; init; }
    public required DateTimeOffset StartsAt { get; init; }
    public required DateTimeOffset EndsAt { get; init; }
    public BookingStatus Status { get; set; }
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ReminderSentAt { get; set; }
}
