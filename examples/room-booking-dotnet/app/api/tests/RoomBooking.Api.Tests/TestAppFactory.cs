using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using RoomBooking.Api.Modules.Bookings.Application.Ports;
using RoomBooking.Api.Tests.Support;

namespace RoomBooking.Api.Tests;

public sealed class TestAppFactory : WebApplicationFactory<Program>
{
    public FakeTimeProvider Time { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureTestServices(services =>
        {
            // The one clock of the app under test is the one the tests control.
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Time);

            // No email leaves the tests; the recorded messages are what the tests assert on.
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<FakeEmailSender>();
            services.AddSingleton<IEmailSender>(sp => sp.GetRequiredService<FakeEmailSender>());
        });
    }
}
