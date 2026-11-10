## Use pg-advisory-lock for PostgreSQL advisory locks

**Tooling:** When a session-level PostgreSQL advisory lock is needed for a domain identity no row or constraint can represent, use `pg-advisory-lock` on a direct or session-pooled connection, and design for the lock being released by connection loss while the callback still runs.

**When:** TypeScript backends on PostgreSQL. It gives no fencing and no exactly-once execution, and does not work through transaction or statement pooling.

Bad: the library used through a transaction-pooled PgBouncer.
Good: the library used on a direct connection.

Links: [pg-advisory-lock](https://github.com/IlyaSemenov/pg-advisory-lock)
