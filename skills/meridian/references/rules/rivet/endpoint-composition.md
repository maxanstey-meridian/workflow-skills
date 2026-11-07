## Endpoint Composition

Minimal API groups expose `MapXEndpoints(this IEndpointRouteBuilder ...)` and
`Program.cs` composes every such group in its project. `Program.cs` contains no
inline business handlers; literal `/`, `/health`, and `/api/health` bootstrap
handlers are the root/health exception. `MapGroup` itself is composition, not an
inline handler.

The receiver rule validates only the extension target: the ordinary or fully
qualified `Microsoft.AspNetCore.Routing.IEndpointRouteBuilder` type is valid;
`WebApplication` is not. It does not by itself prove file placement, naming, or
that `Program.cs` composed the group.
