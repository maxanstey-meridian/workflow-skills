using Cowork.Api.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Respawn;

namespace Cowork.Api.Tests.TestSupport;

/// <summary>
/// One PostgreSQL test database per run, created from the server named by
/// COWORK_TEST_DATABASE (default: the local Postgres at localhost:55471),
/// migrated once, and reset with Respawn between tests.
/// </summary>
public sealed class CoworkTestDatabase : IAsyncLifetime
{
    private readonly string _serverConnectionString = Environment.GetEnvironmentVariable(
        "COWORK_TEST_DATABASE"
    ) ?? "Host=localhost;Port=55471;Database=postgres;Username=postgres;Password=postgres";

    private Respawner _respawner = null!;
    private string _databaseName = null!;

    public string ConnectionString { get; private set; } = "";

    public async Task InitializeAsync()
    {
        _databaseName = $"cowork_test_{Guid.NewGuid():N}";
        await using (var admin = NpgsqlDataSource.Create(_serverConnectionString))
        {
            await using var command = admin.CreateCommand($"CREATE DATABASE {_databaseName}");
            await command.ExecuteNonQueryAsync();
        }

        ConnectionString = new NpgsqlConnectionStringBuilder(_serverConnectionString)
        {
            Database = _databaseName,
        }.ConnectionString;

        var options = new DbContextOptionsBuilder<CoworkDbContext>()
            .UseNpgsql(ConnectionString)
            .UseSnakeCaseNamingConvention()
            .Options;
        await using var db = new CoworkDbContext(options);
        await db.Database.MigrateAsync();

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        _respawner = await Respawner.CreateAsync(
            connection,
            new RespawnerOptions
            {
                DbAdapter = DbAdapter.Postgres,
                TablesToIgnore = ["__EFMigrationsHistory"],
            }
        );
    }

    public async Task ResetAsync()
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await _respawner.ResetAsync(connection);
    }

    public async Task DisposeAsync()
    {
        await using (var admin = NpgsqlDataSource.Create(_serverConnectionString))
        {
            await using var command = admin.CreateCommand(
                $"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{_databaseName}' AND pid <> pg_backend_pid()"
            );
            await command.ExecuteNonQueryAsync();
            await using var drop = admin.CreateCommand($"DROP DATABASE {_databaseName}");
            await drop.ExecuteNonQueryAsync();
        }
    }
}

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<CoworkTestDatabase>
{
    public const string Name = "cowork-database";
}

/// <summary>Base for tests that run against the real PostgreSQL database.</summary>
[Collection(DatabaseCollection.Name)]
public abstract class DatabaseTest : IAsyncLifetime
{
    protected CoworkTestDatabase Database { get; }

    protected DatabaseTest(CoworkTestDatabase database) => Database = database;

    public Task InitializeAsync() => Database.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;
}
