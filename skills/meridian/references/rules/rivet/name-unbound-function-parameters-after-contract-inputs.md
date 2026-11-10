## Name unbound function parameters after contract inputs

**Tooling:** Name each function parameter that has no binding attribute after a route token, a declared query parameter, or a top-level property of the contract's JSON body.

**When:** Azure Functions handlers for Rivet routes (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response). Such a parameter is filled by name, ignoring case, from a route value, else a query parameter, else a top-level JSON body property; never a header, cookie, or form field. A name nothing carries is `null`, and a value type fails the call; `--check` reports a parameter the contract does not declare as `RIV4006`.

Bad: `Run(HttpRequest req, string fmt)` on the route `images/{format}`.
Good: `Run(HttpRequest req, string format)` on the route `images/{format}`.

Links: [Azure Functions guide](https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md), [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
