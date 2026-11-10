## Close published contracts over published types

**Law:** A module's published contract (the types it deliberately exposes to other modules) and the transport contract (the route definitions and wire types in top-level `Contracts/<Feature>/`) refer only to published or shared types, never to a module's Domain, Application, Infrastructure, or presentation types; move wire-facing enums, records, and value shapes into the contract and map at the transport edge (controllers, endpoints, and the mappers beside them).

**When:** Files under a module's published contract folder (`Modules/<Feature>/Contracts/` on .NET, `src/modules/<feature>/contracts/` on TypeScript) and under the top-level transport contract folder (`Contracts/<Feature>/`). C# `public` does not make a domain type published. A module's published contract may be used by Application, integration, and transport contract code.

Bad: a contract record with a property of type `Forms.Domain.FormStatus`.
Good: a `FormStatusDto` enum declared in the contract and mapped at the edge.
