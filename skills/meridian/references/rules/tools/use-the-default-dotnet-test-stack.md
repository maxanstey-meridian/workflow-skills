## Use the default dotnet test stack

**Tooling:** For .NET tests use `xUnit`, `FluentAssertions` 7.x, `Microsoft.AspNetCore.Mvc.Testing`, `Testcontainers`, `Respawn`, and `ArchUnitNET`, with `NSubstitute` where a mock is needed.

**When:** .NET test projects. `FluentAssertions` 8 and later needs a paid licence for commercial use.

Bad: `FluentAssertions` 8.x added to a commercial repo.
Good: `FluentAssertions` pinned to 7.x in the same repo.
