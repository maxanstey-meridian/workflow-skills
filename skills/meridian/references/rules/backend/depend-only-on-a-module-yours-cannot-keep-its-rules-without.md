## Depend only on a module yours cannot keep its rules without

**Law:** A module (a feature folder under `Modules/` or `src/modules/`) may depend on another only when it couldn't keep its own rules if the other had never been built, so which way a dependency runs is a fact about the domain, not a design choice.

**When:** Any two modules where one names the other. Ask it both ways: could this module keep its rules if the other had never been built? When only one of them couldn't, that one may depend on the other, and nothing in the other names it.

Bad: CaseTypes importing Cases to count the Cases on a type.
Good: Cases depending on CaseTypes, because a typed Case's stages, statuses, and permissions come from its Case type version, while a Case type keeps every rule with no Cases at all.
