## Sign 3: Flag defensive bloat

**Default:** Flag null checks on non-nullable or already-validated values, the same rule validated again in several layers, guards on code that only internal callers reach, and clamps or saturation for inputs that validation already refuses.

**When:** Reviewing guards and validation; prove each finding by citing the upstream guarantee that makes it dead (the type, the validator at the boundary, or the database constraint, by `file:line`). Do not flag trust boundaries (HTTP input, deserialisation, message consumers, external API responses, or a host's implementation of a published port), domain invariants a use case or aggregate enforces (`invariants/enforce-an-invariant-at-its-authoritative-boundary.md`), database constraints, or an application check that turns a database constraint or later failure into a declared result or better error while the constraint stays the authority.

Bad: Flagging a controller's HTTP input validation or a use case's authoritative domain invariant check as defensive bloat.
Good: Flagging an internal helper's `if (id == null)` check by citing the non-nullable parameter and boundary validator at `CreateCaseValidator.cs:14` that already guarantee it.
