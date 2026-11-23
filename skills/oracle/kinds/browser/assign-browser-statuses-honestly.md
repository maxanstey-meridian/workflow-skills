## Assign browser statuses honestly

**Law:** Use `active` for intended browser behaviour that passes today and `shortfall` for intended UI behaviour today's app fails to deliver; leave `other-level` (with `reason` naming the owning `api-contract` or unit suite, e.g. `403`/`404` error envelopes the browser does not handle specially) and `struck` (with `reason` for retired rows or platform-unexpressible cases) to the user.

**When:** Setting or reviewing `status` on any `browser` row.

Bad: Having the filler mark a `403` row `other-level`, or marking a missing empty state `active`.
Good: Marking the missing empty state `shortfall`, and leaving `other-level` and `struck` for the user to assign with a `reason`.
