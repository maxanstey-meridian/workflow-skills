## Format csharp with CSharpier

**Tooling:** Format C# with `CSharpier`, wired through a dotnet tool manifest (`.config/dotnet-tools.json`) or `CSharpier.MsBuild`, with no style file of its own, after `dotnet format` has applied analyser fixes.

**When:** Every .NET repo.

Bad: `dotnet format` alone as the format step.
Good: analyser fixes first, then `CSharpier` owns the layout:
```yaml
api:format:
  cmds:
    - dotnet format <Solution>.slnx analyzers --severity warn   # analyzer code fixes
    - dotnet csharpier format .                                   # then CSharpier owns layout
format:check:
  cmds:
    - dotnet csharpier check .
    - dotnet format <Solution>.slnx analyzers --severity warn --verify-no-changes
```
