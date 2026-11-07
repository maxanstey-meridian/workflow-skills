## Failure Modes

Watch for these:

- ports around everything
- fake API abstraction over generated clients
- adapters with Vue imports
- composables importing adapters directly when the port seam should be used
- global stores used as a default transport for unrelated concerns
- promoting code to shared/global before it is actually shared
- re-export shims (`export { X } from "..."`) left behind after promotion — consumers should import from the promoted location directly
- page-local code prematurely moved into `app/features/...`
- product-owned cross-page capabilities erased into generic `app/shared/`
- `can…` / `available…` helpers that compare server status strings, timestamps,
  counters, version lists or roles to decide what the user may do (see
  `frontend/server-rules-stay-on-the-server.md`)
