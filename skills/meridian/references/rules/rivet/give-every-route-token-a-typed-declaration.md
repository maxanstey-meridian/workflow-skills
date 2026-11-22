## Give every route token a typed declaration

**Tooling:** Declare every route token with an input property, `.Parameter<T>(name, "path", ...)`, or a type constraint.

**When:** Rivet routes with `{token}` segments (undeclared tokens fail with `RIV1019`).

Bad: Route `"/api/forms/{id}"` with no `id` on the input.
Good: The same route with `Guid Id` on the input record.

Links: [endpoint builder reference](https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md), [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
