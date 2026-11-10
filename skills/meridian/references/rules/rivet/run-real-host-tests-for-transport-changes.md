## Run real-host tests for transport changes

**Tooling:** When a change touches routing, serialisation, or exception handling at the host, prove it with HTTP tests against the real host, because Rivet's static coverage does not.

**When:** .NET APIs that use Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response, Azure Functions hosts included. Rivet does not enforce serialised JSON shape, member validation, request parsing, optional headers, authorisation policies, or file bytes at run time, and a handler that returns a native result bypasses its checks.

Bad: a route-prefix change shipped on a green `--check`.
Good: the same change with an HTTP test that calls the running host on the new route.
