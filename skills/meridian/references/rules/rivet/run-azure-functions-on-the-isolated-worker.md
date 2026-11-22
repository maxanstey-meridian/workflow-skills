## Run Azure Functions on the isolated worker

**Tooling:** Run Azure Functions Rivet routes on the isolated worker with ASP.NET integration (`ConfigureFunctionsWebApplication`), `HttpRequest`, `IActionResult`, and `.ToActionResult()`.

**When:** Rivet routes served from Azure Functions.

Bad: A function taking `HttpRequestData` and writing the response by hand.
Good: A function taking `HttpRequest` and returning `.ToActionResult()` under `ConfigureFunctionsWebApplication`.

Links: [Functions sample](https://github.com/maxanstey-meridian/rivet/tree/main/samples/FunctionsApi), [Azure Functions guide](https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md)
