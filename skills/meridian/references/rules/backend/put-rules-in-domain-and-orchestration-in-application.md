## Put rules in Domain and orchestration in Application

**Default:** Put pure rules, invariants, calculations, and decisions in Domain; put use cases, orchestration, ports, transaction boundaries, and failure semantics in Application; put repositories, HTTP clients, queue/storage adapters, auth integrations, and SDK wrappers in Infrastructure.

**When:** Layered modules (Domain, Application, Infrastructure) on .NET or TypeScript; Infrastructure may depend on frameworks and libraries freely.

Bad: A use case expressing business rules as inline `if/else` branches.
Good: A Domain function called by the use case.
