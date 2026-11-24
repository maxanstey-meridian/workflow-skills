using Cowork.Api.Persistence;
using Cowork.Api.Tests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace Cowork.Api.Tests.Integration;

/// <summary>Runs the shared booking-port behaviour suite on the production database engine.</summary>
[Collection(DatabaseCollection.Name)]
public sealed class PostgresBookingRepositoryBehaviorTests(CoworkTestDatabase database)
    : BookingRepositoryBehaviorTests,
        IAsyncLifetime
{
    public Task InitializeAsync() => database.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    protected override async Task<BookingRepository> CreateRepositoryAsync()
    {
        var options = new DbContextOptionsBuilder<CoworkDbContext>()
            .UseNpgsql(database.ConnectionString)
            .UseSnakeCaseNamingConvention()
            .Options;
        return new Cowork.Api.Modules.Bookings.Infrastructure.EfBookingRepository(
            new CoworkDbContext(options)
        );
    }
}
