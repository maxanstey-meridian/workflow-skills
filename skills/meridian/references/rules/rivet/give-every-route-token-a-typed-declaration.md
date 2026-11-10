## Give every route token a typed declaration

**Tooling:** Every route token has a typed declaration: an input property, `.Parameter<T>(name, "path", ...)`, or a type constraint.

**When:** Rivet routes (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response) with `{token}` segments; an undeclared token is `RIV1019`.

Bad: the route `"/api/forms/{id}"` with no `id` on the input.
Good: the same route with an input record that has `Guid Id`.

Links: [endpoint builder reference](https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md), [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
