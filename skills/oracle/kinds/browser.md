# Kind: `browser`

Playwright browser tests covering what a person sees and can do next across real frontend, API, and database wiring.

## Row inventory

- **Source:** Page-consumed API operations (from Rivet/OpenAPI call sites) plus explicit `uiStates` declared in `oracle.conf.json` (each `{ id, slice?, when }`) for client-only flows such as empty states, validation summaries, progressive disclosure, and live previews.
- **Unplaced call sites:** Any API call site the row script cannot attach to a slice or page is emitted as `{ id, unplaced, slice?, where? }` and tracked under `unplaced:` — never silently skipped.
- **`oracle.conf.json`:** `kind: "browser"`, `rows: [...]`, optional `uiStates: [...]`.

## Expectations (`expect`)

`expect` is an object with:

- `ui` (**required**, non-empty string): what the person sees on screen and can do next (visible heading, message, alert, revealed controls, updated list, navigation, or recovery guidance). Follow Meridian's UI testing rules: assert user-visible outcomes, not exact copy, CSS classes, or layout.
- `api` (optional string): wire-level outcome when it matters alongside the UI (e.g. request method/status or persisted server state).

## Statuses in this kind

- Use `active` for intended browser behaviour that passes today.
- Use `shortfall` for intended UI behaviour today's app fails to deliver.
- Use `other-level` (user only, with `reason` naming the owning suite) for statuses already proven honestly at `api-contract` or unit level (e.g. `403`/`404` error envelopes that the browser does not handle specially).
- Use `struck` (user only, with `reason`) for retired rows or platform-unexpressible cases.

## Execution and banned cheats

Run Playwright against the real frontend, API, and database (no `page.route` interception in end-to-end journeys), emitting JUnit XML. `ledger.mjs results` enforces these AST cheat-lint rules on every matched TS/JS test:

- **All kinds:** `.skip`, `.only`, `test.fixme`, `it.fixme`, `describe.fixme`, `test.fail`, `it.fail`.
- **Browser only:**
  - `.first()`, `.last()`, `.nth()` positional locators (use role, label, or test-id locators instead).
  - `{ force: true }` on clicks or fills.
  - `waitForTimeout(...)` sleeps.
  - `toHaveAttribute("data-...", ...)` assertions on `data-*` implementation attributes.
  - `keyboard.press(...)` unless the locked row explicitly sets `allowKeyboard: true`.
