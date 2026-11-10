## Never declare transport headers as inputs

**Tooling:** Do not declare `Authorization`, `Accept`, or `Content-Type` as a header input, or `Content-Type` as a response header; set a response's media type with `.ProducesContentType(...)`.

**When:** Rivet route definitions (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response); declaring one is `RIV2009`.

Bad: a route that declares `Authorization` as a header input.
Good: the route declares no `Authorization` input, and the security scheme carries it.

Links: [endpoint builder reference](https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md), [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
