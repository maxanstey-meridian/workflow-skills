## Enable nullable, implicit usings, and analyzers in dotnet

**Tooling:** Enable nullable reference types, implicit usings, and the built-in .NET analysers in the project files (`EnforceCodeStyleInBuild` or `AnalysisLevel` in the csproj or `Directory.Build.props`).

**When:** Every .NET project.

Bad: a csproj that sets none of `Nullable`, `ImplicitUsings`, `EnforceCodeStyleInBuild`, or `AnalysisLevel`.
Good: a `Directory.Build.props` that sets `Nullable`, `ImplicitUsings`, `EnforceCodeStyleInBuild`, and `AnalysisLevel` for every project.

Links: [an example Directory.Build.props](https://github.com/maxanstey-meridian/sluice/blob/main/Directory.Build.props)
