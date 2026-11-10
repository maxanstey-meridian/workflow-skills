## Keep trigger and public routes in the contract

**Tooling:** The transport contract (the `[RivetContract]` class in top-level `Contracts/<Feature>/`) owns two constants for each Functions route: `TriggerRoute`, with no leading slash, for the trigger attribute, and `PublicRoute`, the full public path including the host's route prefix, for `Define`.

**When:** Rivet routes (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response) served from Azure Functions. `host.json` defaults the prefix to `api`; with `extensions.http.routePrefix: ""`, `PublicRoute = "/" + TriggerRoute`; a custom prefix appears in the contract the same way. Run the check with the same prefix setting as the deployment.

Bad: `[HttpTrigger(…, Route = "/images/{format}")]` and `Define` given that same string.
Good:
```csharp
public const string TriggerRoute = "images/{format}";
public const string PublicRoute = "/api/" + TriggerRoute;
```

Links: [Functions sample](https://github.com/maxanstey-meridian/rivet/tree/main/samples/FunctionsApi), [Azure Functions guide](https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md)
