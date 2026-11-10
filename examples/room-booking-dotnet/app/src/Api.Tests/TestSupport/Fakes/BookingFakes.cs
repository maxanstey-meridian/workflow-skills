using Cowork.Api.Modules.Bookings.Application.Ports;

namespace Cowork.Api.Tests.TestSupport.Fakes;

public sealed class FakeRoomDirectory : IRoomDirectory
{
    private readonly Dictionary<Guid, RoomSummary> rooms = [];

    public FakeRoomDirectory Seed(params RoomSummary[] seed)
    {
        foreach (var room in seed)
        {
            rooms[room.Id] = room;
        }
        return this;
    }

    public Task<RoomSummary?> FindAsync(Guid roomId, CancellationToken cancellationToken) =>
        Task.FromResult(rooms.GetValueOrDefault(roomId));

    public Task<IReadOnlyDictionary<Guid, string>> FindNamesAsync(
        IReadOnlyCollection<Guid> roomIds,
        CancellationToken cancellationToken
    ) =>
        Task.FromResult<IReadOnlyDictionary<Guid, string>>(
            roomIds
                .Distinct()
                .Select(id => rooms.GetValueOrDefault(id))
                .OfType<RoomSummary>()
                .ToDictionary(summary => summary.Id, summary => summary.Name)
        );
}

public sealed class FakeMemberDirectory : IMemberDirectory
{
    private readonly Dictionary<Guid, MemberContact> members = [];

    public FakeMemberDirectory Seed(params MemberContact[] seed)
    {
        foreach (var member in seed)
        {
            members[member.Id] = member;
        }
        return this;
    }

    public Task<MemberContact?> FindByIdAsync(Guid memberId, CancellationToken cancellationToken) =>
        Task.FromResult(members.GetValueOrDefault(memberId));
}

/// <summary>Captures what the reminder adapter was asked to send.</summary>
public sealed class FakeBookingReminders : IBookingReminders
{
    public List<(string Email, string Subject, string Body)> Sent { get; } = [];

    public Exception? FailureOnNextSend { get; set; }

    public Task SendAsync(
        string email,
        string subject,
        string body,
        CancellationToken cancellationToken
    )
    {
        if (FailureOnNextSend is { } failure)
        {
            FailureOnNextSend = null;
            throw failure;
        }

        Sent.Add((email, subject, body));
        return Task.CompletedTask;
    }
}

public sealed class FixedCurrentMember(Guid memberId) : ICurrentMember
{
    public Guid MemberId => memberId;
}
