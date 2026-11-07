using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace RoomBooking.Api.Persistence;

/// <summary>Design-time store for `dotnet ef`, for any environment without a running host.</summary>
public sealed class BookingDbContextFactory : IDesignTimeDbContextFactory<BookingDbContext>
{
    public BookingDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("ROOMBOOKING_DB")
            ?? "Host=localhost;Port=55471;Username=postgres;Password=postgres;Database=room_booking";
        var options = new DbContextOptionsBuilder<BookingDbContext>()
            .UseNpgsql(connectionString)
            .Options;
        return new BookingDbContext(options);
    }
}
