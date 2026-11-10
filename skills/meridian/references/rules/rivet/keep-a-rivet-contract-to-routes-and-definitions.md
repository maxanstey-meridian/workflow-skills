## Keep a Rivet contract to routes and definitions

**Tooling:** A `[RivetContract]` declaration is a static class holding only `const string` route constants and `static readonly RouteDefinition…` fields built through the `Define` factory, with no methods, properties, instance state, other fields, or domain or application code.

**When:** .NET APIs that use Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response. Rivet is the API's typed edge, not the application's architecture.

Bad: a contract class with a `Validate(request)` helper method on it.
Good: the contract holds only route constants and `Define` fields; the `Validate` logic lives in the use case.

Links: [contracts guide](https://maxanstey-meridian.github.io/rivet/guides/contracts)
