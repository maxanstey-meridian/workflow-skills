## Run the coverage and drift gates

**Tooling:** Run both Rivet checks in CI (checks that fail the build): coverage (`--check` without `--output`) and drift of the generated output (`--verify`).

**When:** Repos that use Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response. Generation, coverage, and real HTTP behaviour are three separate checks, and none stands in for another.

Bad: CI that only regenerates the client.
Good: CI that runs `--check` and `--verify` and fails on either.
