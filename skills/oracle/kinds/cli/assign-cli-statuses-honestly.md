## Assign CLI statuses honestly

**Law:** Use `active` for command behaviour that should pass today, `shortfall` for intended behaviour today's CLI gets wrong (e.g. wrong sort order, missing validation, or wrong exit code), `cant-happen` only when a combination is structurally unreachable (stating why in `reason`), and leave `other-level` and `struck` (with `reason`) to the user when covered elsewhere or retired.

**When:** Setting or reviewing `status` on any `cli` row.

Bad: Marking a command that prints items unsorted as `active` because today's CLI omits sorting.
Good: Marking that row `shortfall` describing today's unsorted output, and leaving `other-level` and `struck` to the user.
