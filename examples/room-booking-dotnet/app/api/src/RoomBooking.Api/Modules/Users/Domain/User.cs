namespace RoomBooking.Api.Modules.Users.Domain;

public sealed class User
{
    private User(Guid id, string name, string email, UserRole role)
    {
        Id = id;
        Name = name;
        Email = email;
        Role = role;
    }

    public Guid Id { get; }

    public string Name { get; }

    public string Email { get; }

    public UserRole Role { get; }

    public static User Register(string name, string email, UserRole role)
    {
        return new User(Guid.CreateVersion7(), name, email, role);
    }
}
