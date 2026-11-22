## Use an outbox only for atomic state plus message

**Law:** Use a transactional outbox only when a committed DB change must reliably emit a message; it is not a stronger DB concurrency control.

**When:** Backend code considering a transactional outbox.

Bad: Adding an outbox so two writers don't overwrite each other.
Good: Using a version column for the writers and no outbox.
