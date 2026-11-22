# Oracle Handoff for `/spec`

When `/spec` builds tests for an `__oracle__` case, read `<case>/oracle.conf.json`, every locked `<case>/*.oracle.yaml`, `<skill>/../oracle/kinds/<kind>.md`, and this file. Carry every rule below into the spec's `## Decisions` and pieces so `/go` builds and closes the case in one straight line.

## Decisions to carry into the spec

1. **No row dropped.** Every `active` and `shortfall` row in the locked `*.oracle.yaml` files gets a test. Rows marked `cant-happen`, `other-level`, or `struck` get no test in this suite.
2. **Locked YAML is read-only.** No piece owns or edits `<case>/*.oracle.yaml`, `frozen.json`, or `locked.json`. If a locked expectation turns out to be wrong, stop and report it rather than editing the oracle.
3. **Shortfalls stay plainly red.** Write every `shortfall` test against the intended `expect` so it fails plainly today. Never wrap it in `.skip`, `.only`, `test.fail`, `test.fixme`, or `[Fact(Skip = ...)]`, and never assert today's bug to make it pass.
4. **Test names match row IDs.** Name each test so its lowercase alphanumeric characters equal the row's `id` (`ledger.mjs results` matches by lowercase-alphanumeric equality and resolves each test file).
5. **Each test piece proves itself through `ledger.mjs results`.** Split test pieces by slice (or test file) with non-overlapping `owns:`. Each test piece's `Proof` runs its tests with JUnit XML output and passes the XML to:
   `node <oracle-skill>/scripts/ledger.mjs results <case> <junit-xml...> --tests <test-files...> --slice <slice>`
   (omit `--slice` if the case has a single slice). `results` enforces lock integrity, expected green/red colour, and AST cheat-lint.

## Final confirmation piece

Add one final piece (`after:` all test pieces) owning `<case>/claims.yaml` (and nothing else):

- **Builder:** reads every locked `active` and `shortfall` row and its test, writes `<case>/claims.yaml` with `{ claims: [{ id, redCondition }] }` naming the exact product breakage that would make each test fail, and runs:
  `node <oracle-skill>/scripts/ledger.mjs verify <case> <case>/claims.yaml && node <oracle-skill>/scripts/ledger.mjs open <case>`
  as its `Proof` (must exit `0`).
- **Critic:** `/go`'s critic adversarially grades every test against its locked row in `<slice>.oracle.yaml` and its entry in `<case>/claims.yaml`. Return `VERDICT: FAIL` if any test asserts today's bug instead of `expect`, weakens `expect` (or omits `expect.ui` in `browser`), skips `when`, or would not actually turn red under its claimed `redCondition`.
