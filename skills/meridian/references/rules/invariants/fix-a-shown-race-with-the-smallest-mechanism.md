## Fix a shown race with the smallest mechanism

**Default:** For a race you have shown, use the first of these that keeps the invariant: accept last-writer-wins when it violates no invariant, a database constraint for a declarative truth, one atomic conditional statement (`INSERT ... ON CONFLICT` or `UPDATE ... WHERE ... RETURNING`) for a state-dependent write, a version or concurrency token when writers must detect stale state, a short transaction at the appropriate isolation level when one invariant needs several writes to be atomic, a row lock when one decision spans existing rows, then an established advisory or distributed-lock library, only when no row, constraint, or atomic statement can represent what is being coordinated.

**When:** Persisted relational state with a demonstrated race (a concrete order of reads and writes that breaks the invariant).

Bad: An advisory lock around "claim the next job".
Good: `UPDATE jobs SET owner = @me WHERE id = @id AND owner IS NULL RETURNING id`.
