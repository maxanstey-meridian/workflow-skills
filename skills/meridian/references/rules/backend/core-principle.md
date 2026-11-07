## Core Principle

Use **vertical slice architecture (VSA) first, clean architecture (CA) where needed**.

That means:

- every meaningful product capability gets its own feature module
- modules are the primary structural unit
- inside a module, use clean architecture only when the domain or infrastructure variability justifies it

TypeScript modular backends use Hono and `typed-inject` by default, and Nest where a repo already uses it.

Do not force full CA into every trivial CRUD slice.

Use strategic DDD to discover boundaries and language: bounded contexts,
context maps, published language, customer/supplier relationships,
anti-corruption layers, and shared kernels. Use tactical DDD — aggregates,
entities, value objects, domain services, specifications — only where domain
complexity earns it. House doctrine is not an anemic-domain rule and not DDD purity.

### When CA is warranted inside a module

Use ports/use-cases/domain types when at least one is true:

- the module has real business rules or invariants worth protecting
- infrastructure could realistically vary or be swapped
- orchestration would become hard to reason about inline
- testability matters because the capability is important or brittle

If none of those are true, stay simpler.
