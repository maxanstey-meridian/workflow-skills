## Never narrow oracle claims to match a weaker test

**Law:** When a spec has `oracleCase`, never narrow a `claims*.yaml` `redCondition` to match a test that misses part of the locked `<slice>.oracle.yaml` `expect`; strengthen the test to prove the full locked `expect`, or report `result: STOPPED` naming the missing assertions and owning piece when the test file is outside your `owns`.

**When:** Writing or fixing `claims.yaml` / `claims-<slice>.yaml` or oracle tests on any attempt (especially attempt 2 after a critic finding).

Bad: Narrowing `redCondition` in `claims.yaml` from "status banner and reload fail" to "HTTP 409 is returned" because the test only asserted the status code, or passing over a missing assertion in another piece's test file.
Good: Adding the missing assertions to your owned test file so it proves the full locked `expect` (and keeping `redCondition` aligned with `expect`), or setting `result: STOPPED` when the weak test lives in a file outside your `owns`.
