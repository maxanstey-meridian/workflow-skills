## Regenerate and commit output with the contract change

**Tooling:** Regenerate through the repo's task and commit the regenerated output in the same change as the contract change that caused it.

**When:** Any change to a Rivet contract (Rivet reads C# and emits the OpenAPI document). The task is the repo's own: `task generate`, `pnpm rivet`, or `dotnet rivet --project … --output …`.

Bad: a contract change committed alongside last week's `schema.d.ts`.
Good: the contract change and the regenerated files in one commit.
