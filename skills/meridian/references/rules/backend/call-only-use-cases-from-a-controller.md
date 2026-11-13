## Call only use cases from a controller

**Law:** A controller, endpoint, or other transport code calls Application use cases (the Application code for one operation), services, or named queries (the Application's types for one read each) only, and holds no orchestration of its own.

**When:** Transport code in a module (one feature's folder under `Modules/` or `src/modules/`), on .NET or TypeScript.

Bad: a controller action that loads two repositories, applies a rule, and saves.
Good: an action that binds the request, calls `ExecuteAsync`, and maps the result.
