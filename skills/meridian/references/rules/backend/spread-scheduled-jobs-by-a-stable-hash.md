## Spread scheduled jobs by a stable hash

**Default:** Never start every tenant's or subject's job at the same instant; offset each by a stable hash of its id across a window, so load spreads and a rerun keeps its slot.

**When:** A scheduled job that runs once per tenant or per subject.

Bad: Every tenant's sync at 02:00:00.
Good: Each tenant's sync at 02:00 plus `hash(tenantId) % 3600` seconds.
