## Never reference a module's root from its layers

**Law:** A module's Contracts, Domain, Application, and Infrastructure never reference module-root types (controller, endpoints, transport mappers, request validators, module registration); the root calls inward, never the reverse.

**When:** .NET backend modules (`Modules/`).

Bad: An EF configuration in `Infrastructure/` reading `FormsRequestValidators.MaxTitleLength`.
Good: Declaring the limit in Domain and reading it from both validator and configuration.
