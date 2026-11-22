## Prove custom concurrency machinery before adding it

**Law:** Before adding a custom lock, lease, retry, heartbeat, fencing, or coordination state, write an interleaving test against the real persistence/runtime with a header comment stating: the invariant, the breaking order of reads and writes, why last-writer-wins fails, which boundary arbitrates, and why every smaller mechanism (constraint, conditional write, version token, short transaction, row lock) fails.

**When:** Any custom concurrency machinery, regardless of size (ordinary SQL, adapter wiring, and tests are not machinery).

Bad: Adding a custom lease table with a unit test that only asserts the lease method was called.
Good: An interleaving test on PostgreSQL whose header comment answers all five points.
