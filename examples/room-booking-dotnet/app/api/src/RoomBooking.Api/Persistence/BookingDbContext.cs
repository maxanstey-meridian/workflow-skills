using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Modules.Bookings.Infrastructure.Persistence;
using RoomBooking.Api.Modules.Identity.Infrastructure.Persistence;
using Booking = RoomBooking.Api.Modules.Bookings.Domain.Booking;
using Room = RoomBooking.Api.Modules.Bookings.Domain.Room;
using User = RoomBooking.Api.Modules.Identity.Domain.User;

namespace RoomBooking.Api.Persistence;

/// <summary>The host-level persistence root; each module owns its entities' mapping.</summary>
public sealed class BookingDbContext(DbContextOptions<BookingDbContext> options)
    : DbContext(options)
{
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfiguration(new RoomConfiguration());
        modelBuilder.ApplyConfiguration(new BookingConfiguration());
        modelBuilder.ApplyConfiguration(new UserConfiguration());
    }
}
