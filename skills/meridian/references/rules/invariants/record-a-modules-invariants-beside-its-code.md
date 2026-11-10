## Record a module's invariants beside its code

**Default:** A module records the invariants it owns in an `INVARIANTS.md` at the module root, beside the code a change would break.

**When:** A backend module (one feature's folder under `Modules/`) that owns at least one invariant worth an entry. A decision with no single owning module, such as deployment topology, contract generation, or a release policy, goes in no `INVARIANTS.md`.

Bad: The forms module's rules written in a wiki page.
Good: `Modules/Forms/INVARIANTS.md`.
