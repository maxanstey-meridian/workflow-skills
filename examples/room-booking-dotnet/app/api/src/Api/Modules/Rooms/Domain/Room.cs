namespace Cowork.Api.Modules.Rooms.Domain;

public sealed class Room
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required int Capacity { get; init; }
}
