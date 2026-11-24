## Grade oracle rows against locked expect

**Law:** When a spec has `oracleCase` and a piece owns oracle tests or `claims*.yaml`, grade every row in the slice as a triangle — locked `<slice>.oracle.yaml` `expect` ↔ test assertions ↔ `claims*.yaml` `redCondition` — and raise a `shrunkCheck` finding (causing `verdict: FAIL`) if either the test or `redCondition` is narrower than the locked `expect`, asserts today's bug, omits `expect.ui` in `browser`, skips `when`, or would not turn red under its claimed `redCondition`.

**When:** Checking any oracle piece on attempt 1 and attempt 2 (never accept attempt-2 edits that resolved an attempt-1 test-gap finding by shrinking `redCondition` in `claims*.yaml` instead of strengthening the test).

Bad: Passing attempt 2 because `claims.yaml` now matches the test assertions, without re-checking both against the locked `<slice>.oracle.yaml` `expect`.
Good: Re-checking the locked `<slice>.oracle.yaml` `expect` on every attempt and reporting `shrunkCheck` when `redCondition` or the test drops any clause of `expect`.
