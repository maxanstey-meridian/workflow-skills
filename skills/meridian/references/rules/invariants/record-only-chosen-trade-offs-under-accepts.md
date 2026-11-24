## Record only chosen trade-offs under Accepts

**Law:** `Accepts` holds only a deliberate trade-off chosen over a working alternative for a stated reason — never a known defect or unchecked promise.

**When:** Writing the optional `accepts` field in `invariants.yaml` (which prevents later changes from "fixing" a deliberate cost).

Bad: `accepts: "Uniqueness is not enforced across tenants."`
Good: Enforcing cross-tenant uniqueness with a unique index and omitting `accepts`.
