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
