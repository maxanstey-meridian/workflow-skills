## Add layers inside a module only when earned

**Default:** Inside a module, add ports, use cases, and domain types only when earned by business rules/invariants worth protecting, plausible infrastructure variability, complex orchestration, or testing needs.

**When:** Shaping a module on .NET or TypeScript ("clean architecture" applied only where earned).

Bad: Domain, Application, and Infrastructure folders with a port and use case for lookup-table CRUD.
Good: One endpoint and one query.
