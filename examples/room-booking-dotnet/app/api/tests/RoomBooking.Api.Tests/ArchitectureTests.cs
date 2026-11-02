using System.Reflection;
using System.Text.RegularExpressions;
using FluentAssertions;
using NetArchTest.Rules;
using Xunit;

namespace RoomBooking.Api.Tests;

/// <summary>
///     The architecture rules of the spec, mechanically enforced. Both namespace selection and
///     dependency matching in NetArchTest are prefix-based, which the rules rely on.
/// </summary>
public sealed class ArchitectureTests
{
    private const string ModulesRoot = "RoomBooking.Api.Modules";

    private static readonly string[] ModuleNames = ["Users", "Rooms", "Bookings"];

    private static Assembly Api => typeof(Program).Assembly;

    private static PredicateList SelectNamespaces(params string[] namespaces)
    {
        var selection = Types.InAssembly(Api).That().ResideInNamespace(namespaces[0]);
        foreach (var name in namespaces.Skip(1))
        {
            selection = selection.Or().ResideInNamespace(name);
        }

        return selection;
    }

    private static void AssertSuccessful(NetArchTest.Rules.TestResult result, string because)
    {
        result
            .IsSuccessful.Should()
            .BeTrue(because, "{0}", string.Join("; ", result.FailingTypeNames ?? []));
    }

    [Fact]
    public void Domain_depends_on_nothing_outside_itself()
    {
        foreach (var module in ModuleNames)
        {
            var siblings = ModuleNames
                .Where(other => other != module)
                .Select(other => $"{ModulesRoot}.{other}")
                .Append($"{ModulesRoot}.{module}.Application")
                .Append($"{ModulesRoot}.{module}.Infrastructure")
                .Append($"{ModulesRoot}.{module}.Contracts")
                .Append("Microsoft.AspNetCore")
                .Append("Microsoft.EntityFrameworkCore")
                .Append("Microsoft.Extensions")
                .Append("System.Net.Http")
                .ToArray();
            AssertSuccessful(
                SelectNamespaces($"{ModulesRoot}.{module}.Domain")
                    .ShouldNot()
                    .HaveDependencyOnAny(siblings)
                    .GetResult(),
                $"{module}.Domain must depend on nothing outside itself"
            );
        }
    }

    [Fact]
    public void Application_does_not_depend_on_Infrastructure_or_AspNetCore()
    {
        AssertSuccessful(
            SelectNamespaces(
                    ModuleNames.Select(module => $"{ModulesRoot}.{module}.Application").ToArray()
                )
                .ShouldNot()
                .HaveDependencyOnAny(
                    ModuleNames
                        .Select(module => $"{ModulesRoot}.{module}.Infrastructure")
                        .Concat(["Microsoft.AspNetCore"])
                        .ToArray()
                )
                .GetResult(),
            "Application layers must not depend on Infrastructure or AspNetCore"
        );
    }

    [Fact]
    public void Modules_never_touch_sibling_module_internals()
    {
        // A module may only see a sibling's published Contracts (snapshots and ports). Its own
        // Contracts may reference its own Domain (the one deliberate seam, e.g. UserSnapshot
        // carrying UserRole); sibling modules only ever see the snapshots.
        foreach (var module in ModuleNames)
        {
            var forbidden = ModuleNames
                .Where(other => other != module)
                .SelectMany(other =>
                    new[]
                    {
                        $"{ModulesRoot}.{other}.Domain",
                        $"{ModulesRoot}.{other}.Application",
                        $"{ModulesRoot}.{other}.Infrastructure",
                    }
                )
                .ToArray();
            AssertSuccessful(
                SelectNamespaces($"{ModulesRoot}.{module}")
                    .ShouldNot()
                    .HaveDependencyOnAny(forbidden)
                    .GetResult(),
                $"{module} must never reference sibling module internals"
            );
        }
    }

    [Fact]
    public void Transport_and_module_internals_do_not_mix()
    {
        // The transport contracts never reach into the modules.
        AssertSuccessful(
            SelectNamespaces("RoomBooking.Api.Contracts")
                .ShouldNot()
                .HaveDependencyOnAny(ModulesRoot)
                .GetResult(),
            "Contracts (transport) must never reference Modules"
        );

        // Module internals (Domain, Application, Infrastructure, and the module's own published
        // Contracts) never reference the transport layer: not the transport contracts, and not
        // the shared error envelope. The module-root endpoint files are the transport edge and
        // sit outside this rule, which is what lets them map failures onto ErrorResponse.
        var layerNamespaces = ModuleNames
            .SelectMany(module =>
                new[]
                {
                    $"{ModulesRoot}.{module}.Domain",
                    $"{ModulesRoot}.{module}.Application",
                    $"{ModulesRoot}.{module}.Infrastructure",
                    $"{ModulesRoot}.{module}.Contracts",
                }
            )
            .ToArray();
        AssertSuccessful(
            SelectNamespaces(layerNamespaces)
                .ShouldNot()
                .HaveDependencyOnAny("RoomBooking.Api.Contracts", "RoomBooking.Api.Common")
                .GetResult(),
            "Module internals must never reference transport Contracts or Common"
        );
    }

    [Fact]
    public void Every_use_case_is_sealed_and_executes_with_cancellation()
    {
        var useCases = Api.GetTypes()
            .Where(type => type.Name.EndsWith("UseCase", StringComparison.Ordinal))
            .ToList();
        useCases.Should().NotBeEmpty("the API is built from use cases");

        foreach (var useCase in useCases)
        {
            useCase.IsSealed.Should().BeTrue($"{useCase.Name} must be sealed");
            var execute = useCase.GetMethod(
                "ExecuteAsync",
                BindingFlags.Public | BindingFlags.Instance
            );
            execute.Should().NotBeNull($"{useCase.Name} must expose a public ExecuteAsync");
            execute!.ReturnType.Should().BeAssignableTo<Task>($"{useCase.Name} must be async");
            var parameters = execute.GetParameters();
            parameters.Should().NotBeEmpty($"{useCase.Name}.ExecuteAsync takes its command");
            parameters[^1]
                .ParameterType.Should()
                .Be(typeof(CancellationToken), $"{useCase.Name}.ExecuteAsync ends with a token");
        }
    }

    [Fact]
    public void Modules_and_host_never_read_the_system_clock_directly()
    {
        // TimeProvider is the only clock. The check runs over the module and host sources; it
        // is a member-access rule, which type references alone cannot prove.
        var sourceRoot = Path.Combine(
            AppContext.BaseDirectory,
            "..",
            "..",
            "..",
            "..",
            "..",
            "src",
            "RoomBooking.Api"
        );
        Directory
            .Exists(sourceRoot)
            .Should()
            .BeTrue($"the test finds the API sources at {sourceRoot}");

        var offenders = new List<string>();
        var forbiddenClock = new Regex(
            @"\bDateTime(Offset)?\.(UtcNow|Now)\b|(?i)\bnow\(\)",
            RegexOptions.Compiled
        );
        foreach (var folder in new[] { "Modules", "Host" })
        {
            foreach (
                var file in Directory.EnumerateFiles(
                    Path.Combine(sourceRoot, folder),
                    "*.cs",
                    SearchOption.AllDirectories
                )
            )
            {
                if (forbiddenClock.IsMatch(File.ReadAllText(file)))
                {
                    offenders.Add(file);
                }
            }
        }

        offenders.Should().BeEmpty("TimeProvider is the only clock");
    }
}
