## Regenerate and commit output with the contract change

**Tooling:** Regenerate via the repo's task (`task generate`, `pnpm rivet`, or `dotnet rivet …`) and commit the output in the same change as the contract edit.

**When:** Any Rivet contract change.

Bad: Committing a contract change alongside stale `schema.d.ts`.
Good: Committing the contract change and regenerated files together.
