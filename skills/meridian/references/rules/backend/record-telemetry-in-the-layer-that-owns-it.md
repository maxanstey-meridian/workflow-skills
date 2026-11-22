## Record telemetry in the layer that owns it

**Default:** Record request telemetry in Transport, DB/external-call telemetry in Infrastructure, and business-context telemetry via a decorator around the Application use case rather than scattered log statements.

**When:** .NET and TypeScript backends (Domain never logs — it returns values and events).

Bad: `logger.LogInformation("Saving form…")` lines scattered through a use case.
Good: A tracing decorator around the use case.
