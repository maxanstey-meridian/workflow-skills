## Record only chosen trade-offs under Accepts

**Law:** `Accepts` (the entry's field for a deliberately chosen cost) holds only a cost chosen over a working alternative, for a stated reason; a known defect or an unchecked promise never goes there, however well documented.

**When:** Writing the `Accepts` field of an entry in a module's `INVARIANTS.md`, the field that stops a later change from "fixing" a deliberate cost.

Bad: "Accepts: uniqueness is not enforced across tenants".
Good: The cross-tenant uniqueness enforced with a unique index, and no `Accepts` line.
