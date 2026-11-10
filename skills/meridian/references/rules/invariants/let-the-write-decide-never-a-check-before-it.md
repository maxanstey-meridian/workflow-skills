## Let the write decide, never a check before it

**Law:** Never rely on a check made before a write (check-then-write) to keep an invariant: the write's constraint, conditional write, concurrency token, or transaction decides, and an application check only improves the error.

**When:** Any write whose correctness depends on the state it read, including an existence check before an insert or update and a decider's refusal (the pure function that guards a lifecycle's actions) in front of a write.

Bad: `if (!await repo.ExistsAsync(name)) await repo.AddAsync(item)`, which still races because another request can insert between the check and the write.
Good: `INSERT ... ON CONFLICT DO NOTHING` against a unique index, with the conflict returned as an outcome.
