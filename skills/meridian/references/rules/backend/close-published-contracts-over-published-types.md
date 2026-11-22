## Close published contracts over published types

**Law:** Module published contracts (`Modules/<Feature>/Contracts/` or `src/modules/<feature>/contracts/`) and transport contracts (`Contracts/<Feature>/`) reference only published or shared types — never Domain, Application, Infrastructure, or presentation types; map at the transport edge.

**When:** Published and transport contract files. C# `public` does not make a domain type published. Application, integration, and transport contract code may use a module's published contract.

Bad: A contract record with a `Forms.Domain.FormStatus` property.
Good: A `FormStatusDto` enum declared in the contract and mapped at the edge.
