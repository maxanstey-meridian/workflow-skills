## Never reference transport contracts from a module

**Law:** A module's Contracts, Domain, Application, and Infrastructure (a module is one feature's folder under `Modules/`) never reference the top-level transport contracts (the API's wire types), and no `global using` brings them in; the transport edge maps to and from module types.

**When:** .NET backends with top-level transport contracts (`<App>.Contracts.*`). The transport edge is `Contracts/**/…TransportMapper` and the module-root presentation files: controllers, endpoints, transport mappers, request validators, and the module's registration.

Bad: `CreateFormUseCase.ExecuteAsync(CreateFormRequest request, …)` taking the wire DTO.
Good: the controller maps `CreateFormRequest` to `CreateFormCommand`.
