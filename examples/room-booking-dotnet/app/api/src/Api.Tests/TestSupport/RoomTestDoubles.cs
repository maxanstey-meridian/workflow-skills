using Cowork.Api.Modules.Rooms.Application.Ports;
using Cowork.Api.Modules.Rooms.Contracts;
using Cowork.Api.Modules.Rooms.Domain;

namespace Cowork.Api.Tests.TestSupport;

public sealed class InMemoryRoomRepository : RoomRepository
{
    private readonly List<Room> _rooms = [];

    public IReadOnlyList<Room> Rooms => _rooms;

    public Task AddAsync(Room room, CancellationToken cancellationToken)
    {
        _rooms.Add(room);
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(Guid roomId, CancellationToken cancellationToken) =>
        Task.FromResult(_rooms.Any(r => r.Id == roomId));

    public Task<IReadOnlyList<Room>> ListAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<Room>>([.. _rooms.OrderBy(r => r.Name)]);
}

public sealed class InMemoryRoomDirectory(params RoomSummary[] rooms) : RoomDirectory
{
    public Task<bool> ExistsAsync(Guid roomId, CancellationToken cancellationToken) =>
        Task.FromResult(rooms.Any(r => r.Id == roomId));

    public Task<IReadOnlyList<RoomSummary>> AllAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<RoomSummary>>([.. rooms]);
}

public sealed record SentReminder(string ToEmail, string RoomName, DateTimeOffset StartsAt);

public sealed class FakeMailer : Mailer
{
    public List<SentReminder> Sent { get; } = [];

    public Task SendBookingReminderAsync(
        BookingReminderEmail reminder,
        CancellationToken cancellationToken
    )
    {
        Sent.Add(new SentReminder(reminder.ToEmail, reminder.RoomName, reminder.StartsAt));
        return Task.CompletedTask;
    }
}
