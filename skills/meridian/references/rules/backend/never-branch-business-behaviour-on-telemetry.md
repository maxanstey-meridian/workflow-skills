## Never branch business behaviour on telemetry

**Default:** Observability keeps dependency direction: no business behaviour depends on telemetry.

**When:** .NET and TypeScript backends.

Bad: a use case that reads a request-count metric to decide whether to accept an operation.
Good: the same use case deciding from its own state, with the metric only recorded.
