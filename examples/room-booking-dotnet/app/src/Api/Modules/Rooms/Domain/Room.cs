namespace Cowork.Api.Modules.Rooms.Domain;

public sealed class Room
{
    public Guid Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public int Capacity { get; private set; }

    private Room() { }

    public static Room Create(string name, int capacity) =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Capacity = capacity,
        };
}
