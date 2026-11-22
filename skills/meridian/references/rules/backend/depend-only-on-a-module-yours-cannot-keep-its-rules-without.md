## Depend only on a module yours cannot keep its rules without

**Law:** A module may depend on another only when it could not keep its own rules if the other had never been built — dependency direction is a domain fact, not a design choice.

**When:** Any two modules where one names the other. Ask both ways: could X keep its rules without Y? When only one cannot, it depends on the other and never vice versa.

Bad: `CaseTypes` importing `Cases` to count cases on a type.
Good: `Cases` depending on `CaseTypes` (a typed case's stages, statuses, and permissions come from its case type, while a case type keeps every rule with no cases).
