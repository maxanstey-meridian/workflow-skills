## Map endpoint groups and compose them at startup

**Tooling:** Each minimal API group exposes `MapXEndpoints(this IEndpointRouteBuilder …)`, and `Program.cs` composes every such group in its project and holds no inline business handler.

**When:** .NET minimal APIs, including those served through Rivet (which reads C# and emits the OpenAPI document and typed terminals for each declared response). Literal `/`, `/health`, and `/api/health` bootstrap handlers are the exception, and `MapGroup` is composition, not a handler. The extension's receiver is `IEndpointRouteBuilder`, not `WebApplication`.

Bad: `app.MapPost("/api/forms", async (…) => { … })` in `Program.cs`.
Good: `app.MapFormsEndpoints()` in `Program.cs`, with the handler in the group's `MapFormsEndpoints(this IEndpointRouteBuilder …)`.
