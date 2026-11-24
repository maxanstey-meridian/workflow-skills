using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Modules.Bookings.Infrastructure;
using Cowork.Api.Modules.Rooms.Domain;
using Cowork.Api.Modules.Rooms.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Cowork.Api.Persistence;

/// <summary>
/// The host-level DbContext: one store, with each module's entities mapped
/// by the configuration class living in that module's Infrastructure.
/// </summary>
public sealed class CoworkDbContext(DbContextOptions<CoworkDbContext> options) : DbContext(options)
{
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Booking> Bookings => Set<Booking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new RoomConfiguration());
        modelBuilder.ApplyConfiguration(new BookingConfiguration());
    }
}
