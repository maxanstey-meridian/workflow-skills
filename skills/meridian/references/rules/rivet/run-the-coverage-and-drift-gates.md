## Run the coverage and drift gates

**Tooling:** Run both Rivet CI gates: coverage (`--check` without `--output`) and generated-output drift (`--verify`).

**When:** Repos using Rivet. Generation, coverage, and real HTTP behaviour are separate checks; none replaces another.

Bad: CI that only regenerates the client.
Good: CI running `--check` and `--verify` and failing on either.
