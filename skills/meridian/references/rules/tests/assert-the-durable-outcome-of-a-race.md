## Assert the durable outcome of a race

**Default:** A concurrency test runs at the boundary that really arbitrates (the database, queue, or workflow engine that decides the winner) and asserts the durable result for the winner, the loser, any retry, and the conflict, not that a lock, repository, or queue method was called.

**When:** A test that proves an invariant (a rule that must always hold) under an interleaving (a concrete order of reads and writes).

Bad: `lock.Received(1).Acquire()`
Good: one row in the table, and the second caller's result is `Conflict`.
