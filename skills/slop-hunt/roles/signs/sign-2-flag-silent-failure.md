## Sign 2: Flag silent failure

**Default:** Flag a broad `catch` that logs and continues, an error turned into `null`, `false`, an empty list, or a default, a `?? fallback` that hides state that should never be missing, fallback branches nobody asked for, exception → result → exception round trips, retries around non-idempotent work, and fire-and-forget `Task`s, unawaited promises, or `async void` outside event handlers.

**When:** Reviewing error handling and async paths; prove each finding by naming the failure that gets lost and what the caller sees instead. Do not flag a specific `catch` that acts on the failure, the app's top-level error boundary (middleware or an error page), or degradation the domain names on purpose. A silent failure that loses data or hides a failed write is a bug, not slop: record it under `alsoNoticed` with `tag: data-loss`.

Bad: Reporting the app's top-level exception middleware as sign 2, or burying a swallowed CSV write failure as a sign 2 slop finding instead of an `alsoNoticed` entry with `tag: data-loss`.
Good: Flagging `catch (Exception) { return []; }` with the lost DB timeout and the empty list the caller sees, and recording a swallowed failed write under `alsoNoticed` with `tag: data-loss`.
