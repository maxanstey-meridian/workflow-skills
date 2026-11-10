## Own each route payload in its transport contract

**Tooling:** Every direct request, success response, file input, and declared `.Returns<T>(...)` payload is a type in the same `Contracts/<Feature>/` folder as its route (the transport contract), never an Application command or result, a Domain model, a controller-nested type, or a module's published contract (the types a module deliberately exposes to other modules).

**When:** .NET APIs that use Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response; this covers hand-written transport contracts, and code `dotnet-rivet --from-openapi` writes is exempt. Scalars, collections, and the shared `ErrorResponse` and `PaginatedResponse<T>` envelopes in `Common/` are wrappers, not owners. A transport record may compose published or shared-kernel value types (small concepts several modules own together); map at the handler.

Bad: `.Returns<CreateFormResult>(201)` naming the use case's result.
Good: `.Returns<CreateFormResponse>(201)`, with `CreateFormResponse` declared in `Contracts/Forms/` and mapped from the result in the handler.
