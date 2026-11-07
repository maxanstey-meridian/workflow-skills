using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Modules.Identity.Application;
using RoomBooking.Api.Persistence;

namespace RoomBooking.Api.Modules.Identity.Infrastructure;

public sealed class EfUsersQueries(BookingDbContext db) : IUsersQueries
{
    public async Task<IReadOnlyList<UserRow>> ListAsync(CancellationToken ct) =>
        await db
            .Users.AsNoTracking()
            .Select(u => new UserRow(u.Id, u.Name, u.Email, u.Role))
            .ToListAsync(ct);
}

public sealed class EfUserLookup(BookingDbContext db) : IUserLookup
{
    public Task<UserRow?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db
            .Users.AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new UserRow(u.Id, u.Name, u.Email, u.Role))
            .SingleOrDefaultAsync(ct);
}
