## Map endpoint groups and compose them at startup

**Tooling:** Expose each minimal API group via `MapXEndpoints(this IEndpointRouteBuilder …)` and compose every group in `Program.cs` with no inline business handlers.

**When:** .NET minimal APIs (including Rivet). Exceptions: literal `/`, `/health`, and `/api/health` bootstrap handlers (`MapGroup` is composition, not a handler). Extend `IEndpointRouteBuilder`, not `WebApplication`.

Bad: `app.MapPost("/api/forms", async (…) => { … })` in `Program.cs`.
Good: `app.MapFormsEndpoints()` in `Program.cs`, with handlers in `MapFormsEndpoints(this IEndpointRouteBuilder …)`.
