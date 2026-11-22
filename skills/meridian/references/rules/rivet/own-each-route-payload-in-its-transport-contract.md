## Own each route payload in its transport contract

**Tooling:** Declare every direct request, success response, file input, and `.Returns<T>(...)` payload in its route's `Contracts/<Feature>/` folder — never an Application command/result, Domain model, controller-nested type, or module published contract.

**When:** Hand-written .NET Rivet transport contracts (`dotnet-rivet --from-openapi` output is exempt). Scalars, collections, and shared `ErrorResponse`/`PaginatedResponse<T>` envelopes in `Common/` are wrappers, not owners. Transport records may compose published or shared-kernel value types; map at the handler.

Bad: `.Returns<CreateFormResult>(201)` using the use case's result.
Good: `.Returns<CreateFormResponse>(201)` declared in `Contracts/Forms/` and mapped in the handler.
