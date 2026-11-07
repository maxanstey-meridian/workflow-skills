using RoomBooking.Api.Kernel;

namespace RoomBooking.Api.Modules.Identity.Application;

public sealed record UserRow(Guid Id, string Name, string Email, ActorRole Role);

public interface IUsersQueries
{
    public Task<IReadOnlyList<UserRow>> ListAsync(CancellationToken ct);
}

/// <summary>Who the acting user is, for endpoints that need the row, not claims alone.</summary>
public interface IUserLookup
{
    public Task<UserRow?> GetByIdAsync(Guid id, CancellationToken ct);
}

public sealed class ListUsers(IUsersQueries users)
{
    public async Task<IReadOnlyList<UserRow>> ExecuteAsync(CancellationToken ct) =>
        (await users.ListAsync(ct)).OrderBy(u => u.Name, StringComparer.OrdinalIgnoreCase).ToList();
}
