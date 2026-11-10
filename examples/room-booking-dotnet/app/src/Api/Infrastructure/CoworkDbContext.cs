using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Modules.Bookings.Infrastructure;
using Cowork.Api.Modules.Rooms.Domain;
using Cowork.Api.Modules.Rooms.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Cowork.Api.Infrastructure;

/// <summary>The host's database. Each module owns its own entity mappings, applied here
/// explicitly; the DbContext itself owns no mapping.</summary>
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
