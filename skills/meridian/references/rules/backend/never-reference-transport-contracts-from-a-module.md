## Never reference transport contracts from a module

**Law:** A module's Contracts, Domain, Application, and Infrastructure never reference top-level transport contracts (`<App>.Contracts.*`), and no `global using` imports them; the transport edge maps both ways.

**When:** .NET backends with top-level transport contracts. The transport edge is `Contracts/**/…TransportMapper` plus module-root presentation files (controllers, endpoints, transport mappers, request validators, module registration).

Bad: `CreateFormUseCase.ExecuteAsync(CreateFormRequest request, …)` taking the wire DTO.
Good: The controller mapping `CreateFormRequest` to `CreateFormCommand`.
