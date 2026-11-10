## Take every route from the contract

**Tooling:** The transport contract (the `[RivetContract]` class in top-level `Contracts/<Feature>/`) owns each route as a constant, and no `Map*(...)` call or `[Http*(...)]` attribute holds a literal route string.

**When:** .NET APIs that use Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response. Minimal APIs use `Contract.X.Route`; controllers use the contract's `const string` in the attribute, since a runtime `.Route` property is not an attribute constant. Bootstrap endpoints in `Program.cs` (health, root) are the one exception.

Bad: `app.MapPost("/api/transcriptions", …)`
Good: `app.MapPost(TranscriptionsContract.Create.Route, …)`, with `public const string CreateRoute = "/api/transcriptions";` in the contract.

Links: [endpoint builder reference](https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md)
