using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;
using RoomBooking.Api.Kernel;
using RoomBooking.Api.Modules.Bookings;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Modules.Bookings.Domain;
using RoomBooking.Api.Persistence;

namespace RoomBooking.Tests.Support;

/// <summary>Shared test plumbing: service wiring and the demo actors.</summary>
public static class TestHost
{
    public static readonly Actor Staff = new(
        Guid.Parse("01940000-0000-7000-0000-000000000aa1"),
        "Test Staff",
        "staff@test.example",
        ActorRole.Staff
    );

    public static readonly Actor MemberMia = new(
        Guid.Parse("01940000-0000-7000-0000-000000000bb1"),
        "Test Mia",
        "mia@test.example",
        ActorRole.Member
    );

    public static readonly Actor MemberKai = new(
        Guid.Parse("01940000-0000-7000-0000-000000000bb2"),
        "Test Kai",
        "kai@test.example",
        ActorRole.Member
    );

    public static FakeTimeProvider Clock(DateTimeOffset utcNow) => new(utcNow);

    public static ServiceProvider Build(
        PostgresFixture db,
        TimeProvider time,
        Action<IServiceCollection>? configure = null
    )
    {
        var services = new ServiceCollection();
        services.AddLogging(builder => builder.ClearProviders().SetMinimumLevel(LogLevel.Warning));
        services.AddDbContext<BookingDbContext>(options => options.UseNpgsql(db.ConnectionString));
        services.AddSingleton<TimeProvider>(time);
        services.AddBooking();
        configure?.Invoke(services);
        return services.BuildServiceProvider();
    }

    /// <summary>Runs one test with a fresh scope; disposes everything afterwards.</summary>
    public static async Task WithScope(
        PostgresFixture db,
        TimeProvider time,
        RecordingEmailSender? emails,
        Func<IServiceProvider, Task> run
    )
    {
        var provider = Build(
            db,
            time,
            services =>
            {
                if (emails is not null)
                {
                    services.AddSingleton<IEmailSender>(emails);
                }
            }
        );
        try
        {
            await using var scope = provider.CreateAsyncScope();
            await run(scope.ServiceProvider);
        }
        finally
        {
            await provider.DisposeAsync();
        }
    }
}

/// <summary>An explicit recording stand-in for IEmailSender — asserts outcomes, never call choreography.</summary>
public sealed class RecordingEmailSender : IEmailSender
{
    public List<EmailMessage> Sent { get; } = [];

    public Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        Sent.Add(message);
        return Task.CompletedTask;
    }
}

public static class BookingAssertions
{
    public static async Task AssertActiveBookingCount(PostgresFixture db, int expected)
    {
        var options = new DbContextOptionsBuilder<BookingDbContext>()
            .UseNpgsql(db.ConnectionString)
            .Options;
        await using var probe = new BookingDbContext(options);
        var count = await probe.Bookings.CountAsync(b =>
            b.Status == BookingStatus.Booked || b.Status == BookingStatus.CheckedIn
        );
        Assert.Equal(expected, count);
    }
}
