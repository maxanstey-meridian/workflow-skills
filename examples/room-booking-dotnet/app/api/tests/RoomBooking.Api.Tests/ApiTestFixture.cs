using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Respawn;
using Respawn.Graph;
using RoomBooking.Api.Host;
using RoomBooking.Api.Host.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace RoomBooking.Api.Tests;

/// <summary>
///     One PostgreSQL Testcontainer for the whole run; migrations applied once at start-up.
///     Before every test the database is reset with Respawn and re-seeded, and the app host is
///     rebuilt, so each test controls its own clock from scratch (FakeTimeProvider only moves
///     forward within one host) and sees its own recorded emails.
/// </summary>
public sealed class ApiTestFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder(image: "postgres:17")
        .WithDatabase("room_booking_test")
        .Build();

    private Respawner _respawner = null!;

    public TestAppFactory Factory { get; private set; } = null!;

    public string ConnectionString { get; private set; } = string.Empty;

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();
        ConnectionString = new NpgsqlConnectionStringBuilder(_container.GetConnectionString())
        {
            Database = "room_booking_test",
        }.ConnectionString;

        // The app reads its database from this environment override.
        Environment.SetEnvironmentVariable("ConnectionStrings__Database", ConnectionString);
        Environment.SetEnvironmentVariable("Scheduling__Enabled", "false");

        // Building the host runs the startup path once: migrations applied, then the
        // Development seed. Nothing may be pending afterwards.
        Factory = new TestAppFactory();
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RoomBookingDbContext>();
            var pending = await db.Database.GetPendingMigrationsAsync();
            pending.Should().BeEmpty("the app migrates its database on start-up");
        }

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        _respawner = await Respawner.CreateAsync(
            connection,
            new RespawnerOptions
            {
                DbAdapter = DbAdapter.Postgres,
                TablesToIgnore = [new Table("__EFMigrationsHistory")],
            }
        );
    }

    public async Task ResetAsync(CancellationToken cancellationToken = default)
    {
        await using (var connection = new NpgsqlConnection(ConnectionString))
        {
            await connection.OpenAsync(cancellationToken);
            await _respawner.ResetAsync(connection);
        }

        await Factory.DisposeAsync();
        Factory = new TestAppFactory();

        using var scope = Factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<DevSeeder>().SeedAsync(cancellationToken);
    }

    public HttpClient CreateClient()
    {
        return Factory.CreateClient();
    }

    public async ValueTask DisposeAsync()
    {
        await Factory.DisposeAsync();
        await _container.DisposeAsync();
        Environment.SetEnvironmentVariable("ConnectionStrings__Database", null);
        Environment.SetEnvironmentVariable("Scheduling__Enabled", null);
    }
}
