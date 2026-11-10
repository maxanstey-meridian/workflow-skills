using Microsoft.EntityFrameworkCore;
using Npgsql;
using Respawn;
using Testcontainers.PostgreSql;

namespace Cowork.Api.Tests.TestSupport;

/// <summary>
/// One PostgreSQL 17 container for the whole run, migrated once; tests reset the data
/// between cases with Respawn.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer container = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("cowork")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    private Respawner respawner = null!;

    public string ConnectionString { get; private set; } = string.Empty;

    public async Task InitializeAsync()
    {
        await container.StartAsync();
        ConnectionString = container.GetConnectionString();

        await using var context = CreateContext();
        await context.Database.MigrateAsync();

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        respawner = await Respawner.CreateAsync(
            connection,
            new RespawnerOptions
            {
                DbAdapter = DbAdapter.Postgres,
                TablesToIgnore = ["__EFMigrationsHistory"],
            }
        );
    }

    public CoworkDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<CoworkDbContext>().UseNpgsql(ConnectionString).Options);

    public async Task ResetAsync()
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await respawner.ResetAsync(connection);
    }

    public async Task DisposeAsync() => await container.DisposeAsync();
}

[CollectionDefinition("postgres")]
public sealed class PostgresCollection : ICollectionFixture<PostgresFixture>;
