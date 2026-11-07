using Microsoft.EntityFrameworkCore;
using Npgsql;
using Respawn;
using Respawn.Graph;
using RoomBooking.Api.Persistence;

namespace RoomBooking.Tests.Support;

/// <summary>
/// One PostgreSQL database for the whole run, migrated once, with data reset
/// between tests by Respawn. The production engine — never an in-memory fake.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    public const string DatabaseName = "room_booking_tests";
    public string ConnectionString => TestConnectionString();

    public static string TestConnectionString() =>
        Environment.GetEnvironmentVariable("ROOMBOOKING_TEST_DB")
        ?? $"Host=localhost;Port=55471;Username=postgres;Password=postgres;Database={DatabaseName}";

    private static string AdminConnectionString() =>
        Environment.GetEnvironmentVariable("ROOMBOOKING_TEST_DB_ADMIN")
        ?? $"Host=localhost;Port=55471;Username=postgres;Password=postgres;Database=postgres";

    private Respawn.Respawner _respawner = null!;
    private NpgsqlDataSource _dataSource = null!;

    public async Task InitializeAsync()
    {
        await using (var admin = new NpgsqlConnection(AdminConnectionString()))
        {
            await admin.OpenAsync();
            await using var drop = new NpgsqlCommand(
                $"DROP DATABASE IF EXISTS {DatabaseName} WITH (FORCE)",
                admin
            );
            await drop.ExecuteNonQueryAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE {DatabaseName}", admin);
            await create.ExecuteNonQueryAsync();
        }

        var options = new DbContextOptionsBuilder<BookingDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;
        await using (var db = new BookingDbContext(options))
        {
            await db.Database.MigrateAsync();
        }

        _dataSource = NpgsqlDataSource.Create(ConnectionString);
        await using var setupConnection = await _dataSource.OpenConnectionAsync();
        _respawner = await Respawn.Respawner.CreateAsync(
            setupConnection,
            new Respawn.RespawnerOptions
            {
                DbAdapter = DbAdapter.Postgres,
                // Demo identities are host-seeded once and shared by API and use-case tests.
                TablesToIgnore = [new Table("__EFMigrationsHistory"), new Table("users")],
            }
        );
        await ResetAsync();
    }

    public async Task ResetAsync()
    {
        await using var connection = await _dataSource.OpenConnectionAsync();
        await _respawner.ResetAsync(connection);
    }

    public async Task DisposeAsync()
    {
        await _dataSource.DisposeAsync();
        await using var admin = new NpgsqlConnection(AdminConnectionString());
        await admin.OpenAsync();
        await using var drop = new NpgsqlCommand(
            $"DROP DATABASE IF EXISTS {DatabaseName} WITH (FORCE)",
            admin
        );
        await drop.ExecuteNonQueryAsync();
    }
}

[CollectionDefinition("postgres")]
public sealed class PostgresCollection : ICollectionFixture<PostgresFixture>;
