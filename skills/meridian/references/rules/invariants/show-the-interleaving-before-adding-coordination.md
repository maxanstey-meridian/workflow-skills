## Show the interleaving before adding coordination

**Law:** Do not add a lock, queue, or other coordination because a race is conceivable; first show a concrete interleaving (an order of two actors' reads and writes) that breaks the stated invariant.

**When:** Before adding any concurrency or messaging mechanism, a library one included.

Bad: A distributed lock around "update profile" because two requests might overlap.
Good: The two-request sequence written out, found harmless because last writer wins, and no lock added.
