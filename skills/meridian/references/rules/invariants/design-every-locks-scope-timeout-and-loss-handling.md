## Design every lock's scope, timeout, and loss handling

**Default:** For every lock, design its name, scope, timeout, cancellation, release, and what happens if the connection or handle is lost while work is still running.

**When:** Any advisory or distributed lock, including library ones.

Bad: `await lock("reindex", work)` with no timeout or connection-loss handling.
Good: A tenant-scoped lock with timeout, cancellation token, and a defined outcome if lost mid-run.
