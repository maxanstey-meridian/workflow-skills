## Coordinate concurrency tests without sleeps

**Default:** Drive concurrency-test actors in a fixed order using barriers, hooks, or controlled transactions — never timing sleeps.

**When:** Interleaving tests proving an invariant.

Bad: Two tasks started with `Task.Delay(50)` between them.
Good: Holding the first transaction at a barrier until the second has read.
