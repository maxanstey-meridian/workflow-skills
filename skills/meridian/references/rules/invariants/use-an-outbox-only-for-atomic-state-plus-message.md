## Use an outbox only for atomic state plus message

**Law:** Use a transactional outbox only when a committed database change must reliably produce a message; it is not a stronger form of database concurrency control.

**When:** Backend code considering an outbox, a table of messages written in the same transaction as the state change and published afterwards.

Bad: An outbox added so two writers don't overwrite each other.
Good: A version column for the writers, and no outbox.
