using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cowork.Api.Tests.TestSupport;

/// <summary>The real host over the shared test database. Only the connection string is
/// redirected; every policy, handler, and sweeper runs as shipped.</summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string connectionString;

    public ApiFactory(string connectionString)
    {
        this.connectionString = connectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration(
            (_, configuration) =>
            {
                configuration.AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["ConnectionStrings:Cowork"] = connectionString,
                    }
                );
            }
        );
        builder.ConfigureServices(services =>
        {
            var descriptor = services.Single(service =>
                service.ServiceType == typeof(DbContextOptions<CoworkDbContext>)
            );
            services.Remove(descriptor);
            services.AddDbContext<CoworkDbContext>(options => options.UseNpgsql(connectionString));
        });
    }
}
