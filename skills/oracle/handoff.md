# Oracle Handoff for `/spec`

When `/spec` builds tests for an `__oracle__` case, read `<case>/oracle.conf.json`, every locked `<case>/*.oracle.yaml`, `<skill>/../oracle/kinds/<kind>.md`, and this file. Set `oracleCase: { path, kind }` on `spec-<name>.yaml` and carry every rule below into `decisions[]` and `pieces[]` so `/go` builds and closes the case in one straight line.

## Spec `oracleCase` field

Set `oracleCase` at the top level of `spec-<name>.yaml`:

```yaml
oracleCase:
  path: <case folder path>
  kind: <kind from oracle.conf.json: api-contract | browser | cli>
```

`spec-ctl.mjs validate spec` verifies `<case>/oracle.conf.json`, `<case>/locked.json`, at least one `<case>/*.oracle.yaml`, and that `oracleCase.kind` matches `oracle.conf.json`.

## Decisions to carry into `decisions[]`

Add these five entries to `decisions[]` (`decidedBy: agreed`):

1. **No row dropped.** Every `active` and `shortfall` row in the locked `*.oracle.yaml` files gets a test. Rows marked `cant-happen`, `other-level`, or `struck` get no test in this suite.
2. **Locked YAML is read-only.** No piece owns or edits `<case>/*.oracle.yaml`, `frozen.json`, or `locked.json`. If a locked expectation turns out to be wrong, stop and report it rather than editing the oracle.
3. **Shortfalls stay plainly red.** Write every `shortfall` test against the intended `expect` so it fails plainly today. Never wrap it in `.skip`, `.only`, `test.fail`, `test.fixme`, or `[Fact(Skip = ...)]`, and never assert today's bug to make it pass.
4. **Test names match row IDs.** Name each test so its lowercase alphanumeric characters equal the row's `id` (`ledger.mjs results` matches by lowercase-alphanumeric equality and resolves each test file).
5. **Each test piece proves itself through `ledger.mjs results`.** Split test pieces in `pieces[]` by slice (or test file) with non-overlapping `owns`. Each test piece's `proof` runs its tests with JUnit XML output and passes the XML to:
   `node <oracle-skill>/scripts/ledger.mjs results <case> <junit-xml...> --tests <test-files...> --slice <slice>`
   (omit `--slice` if the case has a single slice). `results` enforces lock integrity, expected green/red colour, and AST cheat-lint.

## Final confirmation piece in `pieces[]`

Add one final piece to `pieces[]` (`after` listing all test piece IDs) with `owns: [<case>/claims.yaml]` (and nothing else):

- **Builder:** reads every locked `active` and `shortfall` row and its test, writes `<case>/claims.yaml` with `{ claims: [{ id, redCondition }] }` naming the exact product breakage that would make each test fail, and runs:
  `node <oracle-skill>/scripts/ledger.mjs verify <case> <case>/claims.yaml && node <oracle-skill>/scripts/ledger.mjs open <case>`
  as its `proof` (must exit `0`).
- **Critic:** `/go`'s critic adversarially grades every test against its locked row in `<slice>.oracle.yaml` and its entry in `<case>/claims.yaml`. Return `VERDICT: FAIL` if any test asserts today's bug instead of `expect`, weakens `expect` (or omits `expect.ui` in `browser`), skips `when`, or would not actually turn red under its claimed `redCondition`.
