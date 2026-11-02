namespace RoomBooking.Api.Modules.Bookings.Application.Ports;

public sealed record MemberContact(Guid Id, string Name, string Email);

/// <summary>
///     Bookings' required port onto member identity (consumer-owned). The host bridges it to
///     the Users module's published <c>IUserDirectory</c>; the snapshot's role drops here,
///     because reminders only need the address.
/// </summary>
public interface IMemberContacts
{
    public Task<MemberContact?> FindAsync(Guid memberId, CancellationToken cancellationToken);
}
