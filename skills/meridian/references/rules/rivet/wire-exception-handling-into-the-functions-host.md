## Wire exception handling into the Functions host

**Tooling:** Under Azure Functions, wire the API's exception handling into that host.

**When:** Rivet routes (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response) served from Azure Functions.

Bad: the ASP.NET exception middleware assumed to run under Functions.
Good: the handler registered on the Functions host.

Links: [Functions sample](https://github.com/maxanstey-meridian/rivet/tree/main/samples/FunctionsApi), [Azure Functions guide](https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md)
