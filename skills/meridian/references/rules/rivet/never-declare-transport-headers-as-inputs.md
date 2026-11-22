## Never declare transport headers as inputs

**Tooling:** Never declare `Authorization`, `Accept`, or `Content-Type` as a header input, or `Content-Type` as a response header; set response media types with `.ProducesContentType(...)`.

**When:** Rivet route definitions (declaring one triggers `RIV2009`).

Bad: Declaring `Authorization` as a header input.
Good: Omitting `Authorization` from inputs and letting the security scheme carry it.

Links: [endpoint builder reference](https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md), [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
