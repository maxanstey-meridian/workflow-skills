using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Host.Persistence;
using RoomBooking.Api.Modules.Rooms.Domain;
using RoomBooking.Api.Modules.Users.Domain;

namespace RoomBooking.Api.Host;

/// <summary>
///     Seeds the users and rooms the app demos against. Rows are inserted only when the
///     table is empty, so it is safe to run on every start and after every test reset.
/// </summary>
public sealed class DevSeeder(RoomBookingDbContext db, TimeProvider clock)
{
    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        if (!await db.Users.AnyAsync(cancellationToken))
        {
            db.Users.AddRange(
                User.Register("Amara Okafor", "amara@roombooking.dev", UserRole.Staff),
                User.Register("Ben Cohen", "ben@roombooking.dev", UserRole.Member),
                User.Register("Dana Whitfield", "dana@roombooking.dev", UserRole.Member)
            );
            await db.SaveChangesAsync(cancellationToken);
        }

        if (!await db.Rooms.AnyAsync(cancellationToken))
        {
            var createdAt = clock.GetUtcNow();
            db.Rooms.AddRange(
                Room.Open("Willow Room", 8, createdAt),
                Room.Open("Alder Room", 4, createdAt),
                Room.Open("Oak Booth", 2, createdAt)
            );
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
