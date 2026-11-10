## Prove custom concurrency machinery before adding it

**Law:** Before adding a custom lock, lease, retry, heartbeat, fencing, or coordination state, write a test that runs the breaking order of reads and writes against the production persistence or runtime, with a header comment that states the invariant, that order, why last-writer-wins is unacceptable, which boundary arbitrates, and why each smaller mechanism that could apply (a constraint, a conditional write, a version token, a short transaction, a row lock) fails.

**When:** Any custom concurrency machinery, at any size. Ordinary SQL, adapter wiring, and tests are not machinery.

Bad: A hand-written lease table added with a unit test that only asserts the lease method was called.
Good: The same change with an interleaving test (the breaking order of reads and writes) run on PostgreSQL, whose header comment answers the five points.
