namespace RoomBooking.Api.Modules.Rooms.Domain;

public sealed class Room
{
    private Room(Guid id, string name, int capacity, DateTimeOffset createdAt)
    {
        Id = id;
        Name = name;
        Capacity = capacity;
        CreatedAt = createdAt;
    }

    public Guid Id { get; }

    public string Name { get; }

    public int Capacity { get; }

    public DateTimeOffset CreatedAt { get; }

    public static Room Open(string name, int capacity, DateTimeOffset createdAt)
    {
        return new Room(Guid.CreateVersion7(), name, capacity, createdAt);
    }
}
