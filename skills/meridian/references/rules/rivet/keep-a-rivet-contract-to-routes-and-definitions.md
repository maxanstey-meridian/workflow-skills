## Keep a Rivet contract to routes and definitions

**Tooling:** Keep `[RivetContract]` static classes to `const string` route constants and `static readonly RouteDefinition…` fields from `Define` — no methods, properties, instance state, or domain/application code.

**When:** .NET Rivet APIs (Rivet is the typed HTTP edge, not application architecture).

Bad: A contract class with a `Validate(request)` helper method.
Good: Route constants and `Define` fields in the contract; `Validate` in the use case.

Links: [contracts guide](https://maxanstey-meridian.github.io/rivet/guides/contracts)
