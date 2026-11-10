## Keep dotnet tests in a sibling tests project

**Preference:** Use the conventionally named sibling test project (`*.Tests`) for .NET tests.

**When:** .NET backends.

Bad: test classes inside `Api/Modules/Forms/Tests/`.
Good: `Api.Tests/Modules/Forms/CreateFormTests.cs`
