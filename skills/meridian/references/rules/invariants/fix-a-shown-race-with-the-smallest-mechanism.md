## Fix a shown race with the smallest mechanism

**Default:** For a demonstrated race, use the smallest mechanism that holds the invariant, in order: last-writer-wins (if harmless), DB constraint, single atomic conditional write (`INSERT ... ON CONFLICT` / `UPDATE ... WHERE ... RETURNING`), version/concurrency token, short transaction at appropriate isolation, row lock, and only last an established advisory/distributed lock library when no row, constraint, or atomic statement can represent the coordination.

**When:** Persisted relational state with a concrete breaking interleaving.

Bad: An advisory lock around "claim the next job".
Good: `UPDATE jobs SET owner = @me WHERE id = @id AND owner IS NULL RETURNING id`.
