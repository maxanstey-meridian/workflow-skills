using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application.Ports;

/// <summary>Write-side consistency port for rooms.</summary>
public interface IRoomRepository
{
    /// <summary>
    /// Persists a new room. The unique name index is the authority; the outcome
    /// reports whether the insert survived it.
    /// </summary>
    public Task<RoomPersistOutcome> AddAsync(Room room, CancellationToken ct);
}

public enum RoomPersistOutcome
{
    Persisted,
    NameTaken,
}

/// <summary>Read shape for rooms that the read models need.</summary>
public sealed record RoomRow(Guid Id, string Name, int Capacity);

public interface IRoomQueries
{
    public Task<IReadOnlyList<RoomRow>> ListAsync(CancellationToken ct);

    public Task<RoomRow?> GetByIdAsync(Guid id, CancellationToken ct);

    /// <summary>Every room with whether its slot is free in the half-open window [start, end).</summary>
    public Task<IReadOnlyList<RoomAvailabilityRow>> ListForSlotAsync(
        DateTime startUtc,
        DateTime endUtc,
        CancellationToken ct
    );
}

public sealed record RoomAvailabilityRow(Guid RoomId, string Name, int Capacity, bool IsAvailable);
