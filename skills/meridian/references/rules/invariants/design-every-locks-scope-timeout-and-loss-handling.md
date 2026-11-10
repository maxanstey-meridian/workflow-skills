## Design every lock's scope, timeout, and loss handling

**Default:** When you add a lock, design its name, scope, timeout, cancellation, what happens when the connection or handle is lost (the lock can be released while the work is still running), and how it is released.

**When:** Any advisory or distributed lock, a library one included.

Bad: `await lock("reindex", work)` with no timeout and no thought for a dropped connection.
Good: A lock named per tenant, with a timeout, cancellation passed in, and a stated outcome if the lock is lost while the work runs.
