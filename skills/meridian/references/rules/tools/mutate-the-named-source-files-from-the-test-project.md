## Mutate the named source files from the test project

**Tooling:** Run Stryker.NET behind one repo command that starts in the test project's folder and mutates exactly the source files it is given (`-m <file>` for each); never start it in the folder that holds the solution, and never pick its mutants with `--since`.

**When:** A .NET repo's mutation command. Started beside a solution file, Stryker counts every changed file as a test file, so with `--since` one changed Markdown or JSON file retests every mutant, and a changed test file retests everything its tests cover. A `since.ignore-changes-in` pattern that starts with `!` is not a way round it: on Stryker 5.1 it can ignore the C# files too, and the run then passes having tested nothing.

Bad: `dotnet stryker --since:<commit>` in the repo root, which retests all 877 mutants because a README changed.
Good: `tools/mutate.sh Cohort/CohortColumns.cs`, which changes to the test project's folder and runs `dotnet stryker -f stryker-config.json -m CohortColumns.cs`.

Links: [stryker-net issue 3331](https://github.com/stryker-mutator/stryker-net/issues/3331)
