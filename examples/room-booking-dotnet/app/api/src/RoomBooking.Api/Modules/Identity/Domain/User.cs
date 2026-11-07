using RoomBooking.Api.Kernel;

namespace RoomBooking.Api.Modules.Identity.Domain;

public sealed class User
{
    public User(Guid id, string name, string email, ActorRole role)
    {
        Id = id;
        Name = name;
        Email = email;
        Role = role;
    }

    public Guid Id { get; private init; }
    public string Name { get; private init; }
    public string Email { get; private init; }
    public ActorRole Role { get; private init; }
}
