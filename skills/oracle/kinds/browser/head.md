# Kind: `browser`

Playwright browser tests covering what a person sees and can do next across real frontend, API, and database wiring.

## Row inventory

- **Source:** Page-consumed API operations (from Rivet/OpenAPI call sites) plus explicit `uiStates` declared in `oracle.conf.json` (each `{ id, slice?, when }`) for client-only flows such as empty states, validation summaries, progressive disclosure, and live previews.
- **`oracle.conf.json`:** `kind: "browser"`, `rows: [...]`, optional `uiStates: [...]`.

## Expectations (`expect`)

`expect` is an object with:

- `ui` (**required**, non-empty string): what the person sees on screen and can do next (visible heading, message, alert, revealed controls, updated list, navigation, or recovery guidance).
- `api` (optional string): wire-level outcome when it matters alongside the UI (e.g. request method/status or persisted server state).
