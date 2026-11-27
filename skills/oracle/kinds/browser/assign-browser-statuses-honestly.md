## Assign browser statuses honestly

**Law:** Use `active` for intended browser behaviour that passes today, `shortfall` for intended UI behaviour today's app fails to deliver, and `cant-happen` (with a concrete code-path `reason`) for `403`/`404` or other states blocked by route guards or parent-load 404s; leave `other-level` (with `reason` naming the owning `api-contract` or unit suite) and `struck` (with `reason` for retired or platform-unexpressible rows) to the user, and never propose bulk `other-level` on newly exposed rows without verifying each row against the UI and API — `2xx`, `409`, and `422` rows are usually real browser-reachable `active` or `shortfall` journeys.

**When:** Setting or reviewing `status` on any `browser` row.

Bad: Proposing bulk `other-level` on newly exposed `409`/`422` rows or on `403`/`404` rows blocked by route guards or parent-load 404s without checking the UI and API, having the filler set `other-level`, or marking a missing empty state `active`.
Good: Verifying each row against the UI and API — marking reachable `2xx`, `409`, and `422` rows `active` or `shortfall`, marking route-guarded or parent-404-blocked `403`/`404` rows `cant-happen` with the blocking path in `reason`, and leaving verified `other-level` and `struck` calls to the user with a `reason`.
