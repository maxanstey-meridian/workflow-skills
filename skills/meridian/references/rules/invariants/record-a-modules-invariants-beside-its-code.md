## Record a module's invariants beside its code

**Default:** Record a module's invariants in `invariants.yaml` at the module root, beside the code a change would break.

**When:** Any backend module (`Modules/<Feature>`) owning at least one invariant worth an entry. Cross-repo decisions (deployment topology, contract codegen, release policy) do not go in any `invariants.yaml`.

Bad: Recording the forms module's rules on a wiki page.
Good: `Modules/Forms/invariants.yaml`.
