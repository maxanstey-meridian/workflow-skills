using RoomBooking.Api.Modules.Users.Contracts;
using RoomBooking.Api.Modules.Users.Domain;

namespace RoomBooking.Api.Modules.Users.Application;

public sealed class ListUsersQuery(IUserDirectory users)
{
    public Task<IReadOnlyList<UserSnapshot>> ExecuteAsync(
        UserRole? role,
        CancellationToken cancellationToken
    )
    {
        return users.ListAsync(role, cancellationToken);
    }
}
