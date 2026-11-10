## Coordinate concurrency tests without sleeps

**Default:** Drive the actors in a concurrency test in a fixed order with barriers, hooks, or controlled transactions, never with timing sleeps.

**When:** A test that proves an invariant (a rule that must always hold) under an interleaving (a concrete order of reads and writes).

Bad: two tasks started with `Task.Delay(50)` between them.
Good: the first transaction held open at a barrier until the second has read.
