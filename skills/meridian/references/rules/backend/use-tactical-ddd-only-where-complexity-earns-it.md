## Use tactical DDD only where complexity earns it

**Default:** Use strategic DDD (bounded contexts, context maps, published language, anti-corruption layers, shared kernels) to set boundaries and vocabulary, and tactical DDD (aggregates, entities, value objects, domain services, specifications) only where domain complexity earns it.

**When:** Modelling a backend domain on .NET or TypeScript.

Bad: Value objects, an aggregate root, and a specification for a list of office locations.
Good: A record and a query.
