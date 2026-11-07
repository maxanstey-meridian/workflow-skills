namespace RoomBooking.Api.Modules.Bookings.Domain;

public sealed class Room
{
    public Room(Guid id, string name, int capacity, DateTime createdAtUtc)
    {
        Id = id;
        Name = name;
        Capacity = capacity;
        CreatedAtUtc = createdAtUtc;
    }

    public Guid Id { get; private init; }
    public string Name { get; private init; }
    public int Capacity { get; private init; }
    public DateTime CreatedAtUtc { get; private init; }
}
