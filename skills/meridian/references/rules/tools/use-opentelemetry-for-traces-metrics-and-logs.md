## Use OpenTelemetry for traces, metrics, and logs

**Tooling:** Emit OpenTelemetry-compatible traces, metrics, and structured logs, and let the code that assembles the application choose the exporters for each environment.

**When:** .NET and TypeScript backends.

Bad: a vendor SDK's tracer called from a decorator around a use case.
Good: an OpenTelemetry tracing decorator around the use case, with the vendor exporter registered at startup.
