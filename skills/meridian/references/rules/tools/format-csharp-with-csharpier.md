## Format csharp with CSharpier

**Tooling:** Format C# with `CSharpier` (via `.config/dotnet-tools.json` or `CSharpier.MsBuild`, no custom style file) after `dotnet format` applies analyser fixes.

**When:** Every .NET repo.

Bad: Running `dotnet format` alone as the format step.
Good: Analyser fixes first, then `CSharpier` owns layout:
```yaml
api:format:
  cmds:
    - dotnet format <Solution>.slnx analyzers --severity warn
    - dotnet csharpier format .
format:check:
  cmds:
    - dotnet csharpier check .
    - dotnet format <Solution>.slnx analyzers --severity warn --verify-no-changes
```
