## Never use a static logger

**Default:** Observability keeps dependency direction: no ambient static logger.

**When:** .NET and TypeScript backends.

Bad: `Log.Information(…)` from a static `Log` class inside a use case.
Good: A logger injected through the constructor and called in the use case.
