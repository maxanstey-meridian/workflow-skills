using Cowork.Api.Modules.Rooms.Contracts;

namespace Cowork.Api.Modules.Bookings.Application.Ports;

/// <summary>
/// What the bookings module needs to know about rooms. The host bridges this port to the
/// rooms module's published queries; bookings never reach into the rooms module itself.
/// </summary>
public interface IRoomDirectory
{
    public Task<RoomSummary?> FindAsync(Guid roomId, CancellationToken cancellationToken);

    public Task<IReadOnlyDictionary<Guid, string>> FindNamesAsync(
        IReadOnlyCollection<Guid> roomIds,
        CancellationToken cancellationToken
    );
}

/// <summary>The member acting on the API, resolved at the transport edge from the authenticated caller.</summary>
public interface ICurrentMember
{
    public Guid MemberId { get; }
}

public sealed record MemberContact(Guid Id, string Name, string Email);

/// <summary>Looks up a member's contact details for messages to them.</summary>
public interface IMemberDirectory
{
    public Task<MemberContact?> FindByIdAsync(Guid memberId, CancellationToken cancellationToken);
}

/// <summary>
/// The space's own clock: the time comes from the one injected clock, and day and evening
/// questions are answered in the space's time zone, not in UTC.
/// </summary>
public interface ISpaceClock
{
    public DateTimeOffset Now { get; }

    public DateOnly Today { get; }

    public TimeZoneInfo Zone { get; }

    public (DateTimeOffset Start, DateTimeOffset End) DayRange(DateOnly date);
}

/// <summary>Sends a message to one member about one booking.</summary>
public interface IBookingReminders
{
    public Task SendAsync(
        string email,
        string subject,
        string body,
        CancellationToken cancellationToken
    );
}
