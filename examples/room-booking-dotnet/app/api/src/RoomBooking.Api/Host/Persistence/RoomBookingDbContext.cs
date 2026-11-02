using Microsoft.EntityFrameworkCore;
using RoomBooking.Api.Modules.Bookings.Domain;
using RoomBooking.Api.Modules.Bookings.Infrastructure.Persistence;
using RoomBooking.Api.Modules.Rooms.Domain;
using RoomBooking.Api.Modules.Rooms.Infrastructure.Persistence;
using RoomBooking.Api.Modules.Users.Domain;
using RoomBooking.Api.Modules.Users.Infrastructure.Persistence;

namespace RoomBooking.Api.Host.Persistence;

public sealed class RoomBookingDbContext(DbContextOptions<RoomBookingDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Room> Rooms => Set<Room>();

    public DbSet<Booking> Bookings => Set<Booking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Module-owned configurations, applied explicitly (no assembly scanning).
        modelBuilder.ApplyConfiguration(new UserConfiguration());
        modelBuilder.ApplyConfiguration(new RoomConfiguration());
        modelBuilder.ApplyConfiguration(new BookingConfiguration());
    }
}
