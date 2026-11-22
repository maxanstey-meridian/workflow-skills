## Run real-host tests for transport changes

**Tooling:** Prove routing, serialisation, or host exception-handling changes with real-host HTTP tests, since Rivet's static coverage cannot.

**When:** .NET Rivet APIs (including Azure Functions). Rivet does not verify runtime JSON shape, validation, request parsing, optional headers, auth policies, or file bytes, and native results bypass its checks.

Bad: Shipping a route-prefix change on a green `--check` alone.
Good: Adding an HTTP test against the running host on the new route.
