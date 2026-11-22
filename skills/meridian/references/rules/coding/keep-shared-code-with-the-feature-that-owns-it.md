## Keep shared code with the feature that owns it

**Default:** Keep code used by multiple consumers inside its owning feature behind its public entry point (on the backend, its published contract); move to a shared folder only when no single feature owns it.

**When:** Any stack, when a second consumer appears. "Shared" means cross-cutting or co-owned by modules that change it only by agreement.

Bad: Moving the auth feature's session type to `Common/` because three modules read it.
Good: Keeping the session type in auth and exposing it via its published contract.
