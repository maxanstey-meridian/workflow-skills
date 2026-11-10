namespace Cowork.Api.Modules.Rooms.Contracts;

/// <summary>
/// The rooms module's published contract: the room facts other modules may rely on.
/// </summary>
public sealed record RoomSummary(Guid Id, string Name, int Capacity);
