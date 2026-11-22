## Keep trigger and public routes in the contract

**Tooling:** For each Functions route, define two constants in `Contracts/<Feature>/`: `TriggerRoute` (no leading slash) for `[HttpTrigger]` and `PublicRoute` (full public path including route prefix) for `Define`.

**When:** Rivet routes on Azure Functions. `host.json` defaults the prefix to `api` (with `routePrefix: ""`, `PublicRoute = "/" + TriggerRoute`); run `--check` with the deployment prefix.

Bad: Passing `"/images/{format}"` to both `[HttpTrigger]` and `Define`.
Good:
```csharp
public const string TriggerRoute = "images/{format}";
public const string PublicRoute = "/api/" + TriggerRoute;
```

Links: [Functions sample](https://github.com/maxanstey-meridian/rivet/tree/main/samples/FunctionsApi), [Azure Functions guide](https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md)
