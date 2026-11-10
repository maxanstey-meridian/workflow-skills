## Use tactical DDD only where complexity earns it

**Default:** Use strategic domain-driven design (DDD: bounded contexts, the areas where one model and vocabulary hold; context maps; published language; customer/supplier relationships; anti-corruption layers; and shared kernels, small concepts two or more modules own together) to find boundaries and words, and tactical DDD (aggregates, entities, value objects, domain services, specifications) only where the domain's complexity needs it.

**When:** Modelling a backend domain, on .NET or TypeScript.

Bad: value objects, an aggregate root, and a specification for a list of office locations.
Good: a record and a query.
