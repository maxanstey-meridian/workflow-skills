## Take every route from the contract

**Tooling:** Define every route as a constant in `Contracts/<Feature>/` — never pass literal route strings to `Map*(...)` or `[Http*(...)]`.

**When:** .NET Rivet APIs. Minimal APIs use `Contract.X.Route`; controllers use the contract's `const string` (since `.Route` is not a compile-time constant). Exception: bootstrap endpoints in `Program.cs` (health, root).

Bad: `app.MapPost("/api/transcriptions", …)`
Good: `app.MapPost(TranscriptionsContract.Create.Route, …)` backed by `public const string CreateRoute = "/api/transcriptions";`.

Links: [endpoint builder reference](https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md)
