## Put rules in Domain and orchestration in Application

**Default:** Domain holds pure rules, invariants, calculations, and decisions; Application holds use cases (the code for one operation), orchestration, ports (the application-owned types that name a capability), transaction boundaries, and what a failure means; Infrastructure holds repositories, HTTP clients, queue and storage adapters, auth provider integrations, and SDK wrappers, and may depend on frameworks and libraries freely.

**When:** A module (one feature's folder under `Modules/` or `src/modules/`) that has the three layers (Domain, Application, Infrastructure), on .NET or TypeScript.

Bad: a use case with the business rule as inline `if/else` branches.
Good: the rule as a Domain function the use case calls.
