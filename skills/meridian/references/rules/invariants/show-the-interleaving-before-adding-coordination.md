## Show the interleaving before adding coordination

**Law:** Never add a lock, queue, or coordination mechanism because a race feels possible; first demonstrate a concrete read/write interleaving that breaks the stated invariant.

**When:** Before adding any concurrency or messaging mechanism, including library ones.

Bad: Putting a distributed lock around "update profile" because two requests might overlap.
Good: Writing out the two-request sequence, seeing last-writer-wins is harmless, and adding no lock.
