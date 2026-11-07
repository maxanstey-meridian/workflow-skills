## Azure Functions

Use isolated-worker ASP.NET integration (`ConfigureFunctionsWebApplication`),
`HttpRequest`, `IActionResult`, and Rivet's `.ToActionResult()`.

Own separate trigger/public route constants in the contract:

```csharp
public const string TriggerRoute = "images/{format}";
public const string PublicRoute = "/api/" + TriggerRoute;
```

The trigger attribute consumes `TriggerRoute` **without a leading slash**;
`Define` consumes the complete public path. `host.json` defaults to the `api`
prefix; `extensions.http.routePrefix: ""` means `PublicRoute = "/" + TriggerRoute`.
A custom prefix must likewise appear in the contract. A leading slash in the
trigger can break ASP.NET-integrated Functions routing despite a valid spec.

The checker reads the project-adjacent `host.json`, honors
`AzureFunctionsJobHost__extensions__http__routePrefix`, and rejects leading slashes
in trigger routes. Static checks cannot discover
remote deployment overrides. Align the check environment with deployment.

Besides the trigger's `HttpRequest`, a parameter with no binding attribute is
filled by name, ignoring case: a route value, else a query parameter, else a
top-level property of a JSON body; never a header, cookie, or form field. A name
nothing carries is `null` (a value type fails the call), so name each such
parameter after a route token, a declared query parameter, or a property of the
contract's JSON body; `--check` reports one the contract doesn't declare
(`RIV4006`).

The worked sample is
https://github.com/maxanstey-meridian/rivet/tree/main/samples/FunctionsApi (guide:
https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md);
the real-host gate is `task test:functions` in the rivet repo.
Use real HTTP tests for the host/worker routing, serialization, and exception-handling boundary.
