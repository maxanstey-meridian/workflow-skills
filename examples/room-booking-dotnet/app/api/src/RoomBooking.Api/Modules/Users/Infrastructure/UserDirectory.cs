using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Host.Persistence;
using RoomBooking.Api.Modules.Users.Contracts;
using RoomBooking.Api.Modules.Users.Domain;

namespace RoomBooking.Api.Modules.Users.Infrastructure;

public sealed class UserDirectory(RoomBookingDbContext db) : IUserDirectory
{
    public async Task<UserSnapshot?> FindByEmailAsync(
        string email,
        CancellationToken cancellationToken
    )
    {
        var user = await db
            .Users.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Email == email, cancellationToken);
        return user?.ToSnapshot();
    }

    public async Task<UserSnapshot?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await db
            .Users.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return user?.ToSnapshot();
    }

    public async Task<IReadOnlyList<UserSnapshot>> ListAsync(
        UserRole? role,
        CancellationToken cancellationToken
    )
    {
        var query = db.Users.AsNoTracking();
        if (role is { } roleValue)
        {
            query = query.Where(user => user.Role == roleValue);
        }

        return await query
            .OrderBy(user => user.Name)
            .Select(user => new UserSnapshot(user.Id, user.Name, user.Email, user.Role))
            .ToListAsync(cancellationToken);
    }
}

file static class UserMapping
{
    public static UserSnapshot ToSnapshot(this User user)
    {
        return new UserSnapshot(user.Id, user.Name, user.Email, user.Role);
    }
}
