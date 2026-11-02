using RoomBooking.Api.Modules.Users.Domain;

namespace RoomBooking.Api.Modules.Users.Contracts;

public sealed record UserSnapshot(Guid Id, string Name, string Email, UserRole Role);

public interface IUserDirectory
{
    public Task<UserSnapshot?> FindByEmailAsync(string email, CancellationToken cancellationToken);

    public Task<UserSnapshot?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    public Task<IReadOnlyList<UserSnapshot>> ListAsync(
        UserRole? role,
        CancellationToken cancellationToken
    );
}
