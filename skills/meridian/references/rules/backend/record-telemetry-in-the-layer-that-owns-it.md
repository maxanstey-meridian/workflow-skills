## Record telemetry in the layer that owns it

**Default:** Transport records request telemetry, Infrastructure records database and external-call telemetry, and an Application operation that is traced or measured carries its business context and is instrumented through a decorator around the use case (the Application code for one operation) rather than scattered log statements.

**When:** .NET and TypeScript backends. Domain records nothing: its decisions produce values and events, not log lines.

Bad: `logger.LogInformation("Saving form…")` lines through a use case.
Good: A tracing decorator around the use case.
