## Use an advisory lock only for a domain identity

**Default:** Use an advisory lock only when the thing locked is a real domain identity that no row, constraint, or atomic statement can represent; it is not the way to make an operation idempotent or to suppress duplicates.

**When:** Backend code considering an advisory or distributed lock (a library one included).

Bad: `pg_advisory_lock(hash(requestBody))` to stop double submits.
Good: A unique index on the idempotency key.
