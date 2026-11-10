## Run Azure Functions on the isolated worker

**Tooling:** An Azure Functions host for Rivet routes uses the isolated worker with ASP.NET integration (`ConfigureFunctionsWebApplication`), `HttpRequest`, `IActionResult`, and Rivet's `.ToActionResult()`.

**When:** Rivet routes (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response) served from Azure Functions.

Bad: a function that takes `HttpRequestData` and writes the response by hand.
Good: a function that takes `HttpRequest` and returns `.ToActionResult()`, on a host built with `ConfigureFunctionsWebApplication`.

Links: [Functions sample](https://github.com/maxanstey-meridian/rivet/tree/main/samples/FunctionsApi), [Azure Functions guide](https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md)
