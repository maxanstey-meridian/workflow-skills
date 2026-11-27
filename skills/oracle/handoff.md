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

## Reuse before designing pieces

Before designing `pieces[]` for an oracle case, inspect the repo's existing shared test helpers (such as `helpers/`, `journeys/`, and existing `e2e/oracle/**` folders) and name the exact imports in each piece's `reuse`.

- Keep `<case>/{setup,scenarios,actions}.ts` strictly to page-specific fixtures and locators. Never copy-paste HTTP/CSRF wrappers, `responseWhile`/request spies, OpenAPI `parseResponse` or `typed-json` guards, cleanup fixtures, date formatters, auth/org registration, or disposable-DB helpers between cases.
- When a second oracle case needs a helper that only exists inside an earlier case's folder, add a first piece (which the test pieces depend on via `after`) that promotes it to a shared E2E helper module and updates the earlier case to direct imports — no re-export shims.
- Prefer the repo's OpenAPI-backed `parseResponse` helper (when present) over hand-rolled `parse*` guards or inline `z.object(...)` DTO schemas.

## Decisions to carry into `decisions[]`

Add these six entries to `decisions[]` (`decidedBy: agreed`):

1. **No row dropped.** Every `active` and `shortfall` row in the locked `*.oracle.yaml` files gets a test. Rows marked `cant-happen`, `other-level`, or `struck` get no test in this suite.
2. **Locked YAML is read-only.** No piece owns or edits `<case>/*.oracle.yaml`, `frozen.json`, or `locked.json`. If a locked expectation turns out to be wrong, stop and report it rather than editing the oracle.
3. **Shortfalls stay plainly red.** Write every `shortfall` test against the intended `expect` so it fails plainly today. Never wrap it in `.skip`, `.only`, `test.fail`, `test.fixme`, or `[Fact(Skip = ...)]`, and never assert today's bug to make it pass.
4. **Test names match row IDs.** Name each test so its lowercase alphanumeric characters equal the row's `id` (`ledger.mjs results` matches by lowercase-alphanumeric equality and resolves each test file).
5. **Each test piece owns its slice's claims and proves itself through `ledger.mjs results` and `verify`.** Split test pieces in `pieces[]` by slice (or test file) with non-overlapping `owns`. Each test piece owns both its test file(s) and `<case>/claims-<slice>.yaml` (or `<case>/claims.yaml` when the case has a single slice), writing `{ claims: [{ id, redCondition }] }` naming the exact product breakage that would make each test fail. Each test piece's `proof` runs its tests with JUnit XML output and passes the XML and claims file to:
   `node <oracle-skill>/scripts/ledger.mjs results <case> <junit-xml...> --tests <test-files...> --slice <slice> && node <oracle-skill>/scripts/ledger.mjs verify <case> <case>/claims-<slice>.yaml --slice <slice>`
   (omit `--slice <slice>` and use `claims.yaml` if the case has a single slice). `results` enforces lock integrity, expected green/red colour, and AST cheat-lint, and writes `<case>/run-state/<slice>.json`; `verify` binds each row's `redCondition` and test-file hash in that slice's run-state file.
   - **Reuse existing runner config, keep parallelism in Playwright config, and namespace test folders by case:** Before adding a JUnit reporter, search the repo for an existing oracle runner config (such as `playwright.oracle.config.*`). For `browser` cases with none, create a dedicated `playwright.oracle.config.ts` extending the base config for JUnit XML wiring rather than altering the base config's reporter. Check whether the repo's base `playwright.config.*` already has a `fullyParallel: true` project covering `e2e/oracle/**/*.spec.ts`: if it does, do not add per-file `test.describe.configure({ mode: "parallel" })`; if it still runs `e2e/oracle/**` serially while `playwright.oracle.config.*` is parallel, flag or fix that once in `playwright.config.*` so `task ci` does not silently regress to serial. Put generated oracle tests under a case-scoped folder (e.g. `e2e/oracle/<case>/`) so multiple `__oracle__` cases in one repo never collide.
6. **Reuse shared helpers and keep per-case files page-specific.** Keep `<case>/{setup,scenarios,actions}.ts` strictly to page-specific fixtures and locators, import shared E2E helpers directly (promoting any helper needed by a second case into a shared module with no re-exports), and use the repo's OpenAPI-backed `parseResponse` helper (when present) over hand-rolled `parse*` guards or inline `z.object(...)` DTO schemas.

## Grading and closing the case

- **No separate `claims.yaml` piece:** Do not create a trailing piece that owns only `claims.yaml` without the test files — split ownership prevents the builder from fixing weak tests caught by the critic.
- **Per-slice critic:** `/go`'s critic adversarially grades every row in the slice as a triangle: locked `<slice>.oracle.yaml` `expect` ↔ test assertions ↔ `<case>/claims-<slice>.yaml` `redCondition`. Return `verdict: FAIL` (`shrunkCheck`) if any test or `redCondition` is narrower than the locked `expect`, asserts today's bug, omits `expect.ui` in `browser`, skips `when`, or would not actually turn red under its claimed `redCondition`.
- **Closure in `doneMeans`:** Include `node <oracle-skill>/scripts/ledger.mjs open <case>` in `doneMeans[]` (must exit `0`), proving every `active` and `shortfall` row across all slices is locked, ran its expected colour, passed cheat-lint, and is verified with an unchanged test-file hash.
