## Never reference a module's root from its layers

**Law:** A module's Contracts, Domain, Application, and Infrastructure never reference the types at the module's root (the controller, endpoints, transport mappers, request validators, and the module's registration); the root calls into the layers, never the reverse.

**When:** .NET backends, in a module (one feature's folder under `Modules/`).

Bad: an EF configuration in `Infrastructure/` reading `FormsRequestValidators.MaxTitleLength`.
Good: the limit declared in Domain, read by both the validator and the configuration.
