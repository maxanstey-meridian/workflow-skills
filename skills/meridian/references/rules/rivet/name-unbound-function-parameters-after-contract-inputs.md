## Name unbound function parameters after contract inputs

**Tooling:** Name every unbound function parameter after a route token, declared query parameter, or top-level JSON body property in the contract.

**When:** Azure Functions Rivet handlers. Parameters bind case-insensitively from route, then query, then top-level JSON body (never headers, cookies, or forms); unmatched names bind `null` (failing value types) and trigger `RIV4006` in `--check`.

Bad: `Run(HttpRequest req, string fmt)` on route `images/{format}`.
Good: `Run(HttpRequest req, string format)` on route `images/{format}`.

Links: [Azure Functions guide](https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md), [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
