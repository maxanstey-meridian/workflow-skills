namespace RoomBooking.Api.Kernel;

/// <summary>
/// The acting user, resolved from authentication and passed into Application.
/// Deliberate shared kernel: both the Identity and Booking modules depend on it.
/// </summary>
public enum ActorRole
{
    Staff,
    Member,
}

public sealed record Actor(Guid Id, string Name, string Email, ActorRole Role);
