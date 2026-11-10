## Keep shared code with the feature that owns it

**Default:** Code used by several consumers stays with the feature that owns it, behind that feature's public entry point (on the backend, the module's published contract: the types it deliberately exposes to other modules); move it to the shared folder only when no single feature owns it.

**When:** Any stack, when a second consumer appears. "Shared" means owned by no single feature: cross-cutting, or co-owned by modules that change it only by agreement.

Bad: The auth feature's session type moved to `Common/` because three modules read it.
Good: The session type stays in the auth feature and is exposed through its published contract.
