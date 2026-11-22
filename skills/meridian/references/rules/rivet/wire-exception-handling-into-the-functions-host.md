## Wire exception handling into the Functions host

**Tooling:** Under Azure Functions, register the API's exception handling directly on the Functions host.

**When:** Rivet routes served from Azure Functions.

Bad: Assuming ASP.NET exception middleware runs under Functions.
Good: Registering the exception handler on the Functions host.

Links: [Functions sample](https://github.com/maxanstey-meridian/rivet/tree/main/samples/FunctionsApi), [Azure Functions guide](https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md)
