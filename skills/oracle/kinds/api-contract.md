# Kind: `api-contract`

Fast HTTP contract tests covering every `(operation, status)` outcome declared by the API.

## Row inventory

- **Source:** Generated OpenAPI document, Rivet transport contracts, or route definitions.
- **Row shape:** One row per `(operation, status)` pair, with `slice` grouped by module or resource (e.g. `forms`, `cases`) and optional `where` pointing to the endpoint or contract file.
- **IDs:** Stable, descriptive IDs that map cleanly to test names (e.g. `create_form_201`, `create_form_422_empty_name`, `get_form_404`). Normalisation strips non-alphanumeric characters and lowercases, so keep IDs distinct after normalisation.
- **`oracle.conf.json`:** `kind: "api-contract"`, `rows: [...]`. Do not set `uiStates`.

## Expectations (`expect`)

`expect` is a plain string stating:

1. The HTTP status code and declared error `code` (for non-2xx responses) or key response fields (for 2xx responses).
2. Any durable state change or invariant that must hold after the call (e.g. row persisted, tenant isolation enforced, rejected write leaves stored state unchanged).
3. Authorisation or ownership rules where the status is `401`, `403`, or `404`.

Write expectations in product and contract terms, not internal class or repository calls.

## Statuses in this kind

- Use `active` for every declared outcome the API should satisfy today.
- Use `shortfall` when today's API returns the wrong status, error code, payload, or state.
- Use `cant-happen` only when a declared status cannot be triggered through the contract (state why in `reason`).
- Use `struck` (user only) for infrastructure-only statuses that tests cannot honestly trigger (e.g. `503` upstream outage with no trigger hook).

## Execution and cheat-lint

- Run against the real host and real database (e.g. ASP.NET `WebApplicationFactory` + PostgreSQL Testcontainer, or real Hono app + DB), emitting JUnit XML.
- `ledger.mjs results` bans `.skip`, `.only`, `test.fixme`, and `test.fail` in TS/JS test files, and `[Fact(Skip = ...)]` / `[Theory(Skip = ...)]` in C# test files.
- Never loosen status, error-code, or state assertions to make a broken endpoint pass.
