## Let the write decide, never a check before it

**Law:** Never rely on check-then-write to hold an invariant: the write's constraint, conditional write, concurrency token, or transaction decides, and any prior check only improves the error.

**When:** Any state-dependent write, including existence checks before insert/update and decider refusals before writes.

Bad: `if (!await repo.ExistsAsync(name)) await repo.AddAsync(item)`, which races between check and write.
Good: `INSERT ... ON CONFLICT DO NOTHING` against a unique index, returning the conflict as an outcome.
