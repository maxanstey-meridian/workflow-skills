## Evolve schemas and contracts by expand and contract

**Default:** When old and new versions can run side by side during a deployment, change a database schema or a public contract by expanding first, moving consumers, and contracting last.

**When:** Database migrations and public API contracts.

Bad: One migration that renames `name` to `title` while the old build still runs.
Good: Add `title`, write both, switch readers, then drop `name` in a later release.
