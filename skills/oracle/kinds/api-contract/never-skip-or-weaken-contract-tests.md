## Never skip or weaken contract tests

**Law:** Never use `.skip`, `.only`, `test.fixme`, or `test.fail` in TS/JS test files, or `[Fact(Skip = ...)]` / `[Theory(Skip = ...)]` in C# test files (all banned by `ledger.mjs results`), and never loosen status, error-code, or state assertions to make a broken endpoint pass.

**When:** Writing or updating any `api-contract` test.

Bad: Adding `[Fact(Skip = "broken")]` or asserting `status >= 400` because today's endpoint returns `500` instead of `422`.
Good: Asserting `422` with the declared error `code` so a `shortfall` row stays red until the endpoint is fixed.
