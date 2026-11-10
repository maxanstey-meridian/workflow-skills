## Add layers inside a module only when earned

**Default:** Inside a module (one feature's folder under `Modules/` or `src/modules/`), use ports (the application-owned types that name a capability), use cases (the Application code for one operation), and domain types only when it has business rules or invariants worth protecting, infrastructure that could realistically vary, orchestration that would be hard to follow inline, or a capability important or brittle enough to need the tests.

**When:** Shaping the inside of a module on a .NET or TypeScript backend; this is "clean architecture" (separate Domain, Application, and Infrastructure layers), applied only where it earns its place.

Bad: Domain, Application, and Infrastructure folders with a port and a use case for a lookup-table CRUD screen.
Good: one endpoint and one query.
