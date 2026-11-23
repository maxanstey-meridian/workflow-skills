## Invoke the CLI directly and emit JUnit

**Tooling:** Invoke the CLI entry point (exported `run(argv)` function or spawned process) directly in tests and emit JUnit XML (e.g. `node --test --test-reporter=junit`).

**When:** Implementing or running any `cli` test suite.

Bad: Testing an internal parser helper without running the CLI entry point or emitting JUnit XML.
Good: Calling `run(["list", "--json"])` or spawning the binary in `node --test --test-reporter=junit`.
