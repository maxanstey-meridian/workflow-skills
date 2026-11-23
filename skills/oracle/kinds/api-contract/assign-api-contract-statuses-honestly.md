## Assign API contract statuses honestly

**Law:** Use `active` for every declared outcome the API should satisfy today, `shortfall` when today's API returns the wrong status, error code, payload, or state, `cant-happen` only when a declared status cannot be triggered through the contract (stating why in `reason`), and leave `struck` to the user for infrastructure-only statuses tests cannot honestly trigger (e.g. `503` upstream outage with no trigger hook).

**When:** Setting or reviewing `status` on any `api-contract` row.

Bad: Marking a broken `422` response `cant-happen`, or having the filler mark a `503` row `struck`.
Good: Marking the broken `422` response `shortfall` with what today's API returns, and leaving `struck` for the user to set on an untriggerable `503`.
