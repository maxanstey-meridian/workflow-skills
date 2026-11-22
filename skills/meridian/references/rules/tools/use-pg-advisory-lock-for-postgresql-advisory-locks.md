## Use pg-advisory-lock for PostgreSQL advisory locks

**Tooling:** For session-level PostgreSQL advisory locks on a domain identity no row or constraint can represent, use `pg-advisory-lock` on a direct or session-pooled connection and handle lock release on connection loss while the callback runs.

**When:** TypeScript backends on PostgreSQL (gives no fencing or exactly-once execution; incompatible with transaction/statement pooling).

Bad: Using `pg-advisory-lock` through transaction-pooled PgBouncer.
Good: Using it on a direct connection.

Links: [pg-advisory-lock](https://github.com/IlyaSemenov/pg-advisory-lock)
