## Never skip or weaken CLI tests

**Law:** Never use `.skip`, `.only`, `test.fixme`, or `test.fail` in TS/JS test files, or `[Fact(Skip = ...)]` / `[Theory(Skip = ...)]` in non-TS test files (all banned by `ledger.mjs results`), and keep `shortfall` tests plainly red against the intended output until the CLI defect is fixed.

**When:** Writing or updating any `cli` test.

Bad: Wrapping a `shortfall` test in `test.skip(...)` or asserting today's wrong exit code `0` instead of `2`.
Good: Asserting `exit 2` with the expected stderr message so the `shortfall` test stays plainly red until the bug is fixed.
