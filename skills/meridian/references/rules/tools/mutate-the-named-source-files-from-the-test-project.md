## Mutate the named source files from the test project

**Tooling:** Run Stryker.NET via one repo command from the test project's folder, mutating only named source files (`-m <file>`); never run from the solution folder or select mutants with `--since`.

**When:** Any .NET repo's mutation command. From a solution folder, Stryker treats every changed file as a test file, so `--since` retests all mutants on a README/JSON edit. Avoid `!` patterns in `since.ignore-changes-in` (Stryker 5.1 can ignore C# files and pass vacuously).

Bad: `dotnet stryker --since:<commit>` from repo root retesting all 877 mutants after a README edit.
Good: `tools/mutate.sh Cohort/CohortColumns.cs` changing into the test project folder and running `dotnet stryker -f stryker-config.json -m CohortColumns.cs`.

Links: [stryker-net issue 3331](https://github.com/stryker-mutator/stryker-net/issues/3331)
