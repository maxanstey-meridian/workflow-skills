## Assert the durable outcome of a race

**Default:** Run concurrency tests at the real arbitrating boundary (DB, queue, or workflow engine) and assert durable outcomes for winner, loser, retries, and conflicts — not mock method calls.

**When:** Any interleaving test proving an invariant.

Bad: `lock.Received(1).Acquire()`
Good: One row in the table, and the second caller receives `Conflict`.
