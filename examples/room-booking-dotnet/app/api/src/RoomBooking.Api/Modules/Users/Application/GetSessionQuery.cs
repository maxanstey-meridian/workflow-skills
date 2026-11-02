using RoomBooking.Api.Modules.Users.Contracts;

namespace RoomBooking.Api.Modules.Users.Application;

public sealed class GetSessionQuery(IUserDirectory users)
{
    public async Task<SessionSnapshot?> ExecuteAsync(
        Guid actorId,
        CancellationToken cancellationToken
    )
    {
        var user = await users.FindByIdAsync(actorId, cancellationToken);
        return user is null ? null : new SessionSnapshot(user, SessionCapabilities.For(user.Role));
    }
}

public sealed record SessionSnapshot(UserSnapshot User, SessionCapabilities Capabilities);
