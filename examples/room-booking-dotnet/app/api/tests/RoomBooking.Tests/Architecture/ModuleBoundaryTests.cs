using NetArchTest.Rules;

namespace RoomBooking.Tests.Architecture;

/// <summary>
/// Dependency rules the repo talks about, mechanically checked: the layer
/// dependencies inside the Bookings module, and the Contracts/Modules split.
/// </summary>
public sealed class ModuleBoundaryTests
{
    private const string Root = "RoomBooking.Api";

    [Fact]
    public void Booking_domain_depends_on_nothing_but_the_language()
    {
        var result = Types
            .InAssembly(typeof(RoomBooking.Api.Modules.Bookings.Domain.BookingLifecycle).Assembly)
            .That()
            .ResideInNamespace($"{Root}.Modules.Bookings.Domain")
            .ShouldNot()
            .HaveDependencyOnAny(
                $"{Root}.Modules.Bookings.Application",
                $"{Root}.Modules.Bookings.Infrastructure",
                $"{Root}.Contracts",
                $"{Root}.Kernel",
                "Microsoft.EntityFrameworkCore",
                "Npgsql"
            )
            .GetResult();

        Assert.True(result.IsSuccessful, FailureNames(result));
    }

    [Fact]
    public void Booking_application_never_touches_infrastructure_or_the_transport()
    {
        var result = Types
            .InAssembly(typeof(RoomBooking.Api.Modules.Bookings.Application.BookRoom).Assembly)
            .That()
            .ResideInNamespace($"{Root}.Modules.Bookings.Application")
            .ShouldNot()
            .HaveDependencyOnAny(
                $"{Root}.Modules.Bookings.Infrastructure",
                $"{Root}.Contracts",
                $"{Root}.Auth",
                $"{Root}.Sweeping",
                $"{Root}.Persistence",
                "Microsoft.EntityFrameworkCore"
            )
            .GetResult();

        Assert.True(result.IsSuccessful, FailureNames(result));
    }

    [Fact]
    public void Contracts_never_reach_into_modules()
    {
        var result = Types
            .InAssembly(typeof(RoomBooking.Api.Contracts.Booking.BookingContract).Assembly)
            .That()
            .ResideInNamespace($"{Root}.Contracts")
            .ShouldNot()
            .HaveDependencyOn($"{Root}.Modules")
            .GetResult();

        Assert.True(result.IsSuccessful, FailureNames(result));
    }

    private static string FailureNames(TestResult result) =>
        "rule violated by: " + string.Join(", ", result.FailingTypeNames ?? []);
}
