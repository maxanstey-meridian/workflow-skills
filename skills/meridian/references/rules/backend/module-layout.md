## Backend Module Layout

Use this when designing, reviewing, or refactoring a backend toward a
modular-monolith shape with:

- vertical slice architecture at the module boundary
- clean architecture applied inside modules where it earns its place
- ports and adapters for external variability
- strict dependency direction

This is the Meridian backend default for both .NET modular monoliths and
TypeScript modular backends. Its sections are one
design and are read together: each assumes the others.

### Default Recommendation

Build a **single-project or single-package modular monolith** first.

Do not start with:

- flat service folders
- giant `common/services`
- many tiny packages/projects
- fake microservice boundaries

The stable boundary is the **module**, not the class and not the package.

### Core Principle

Use **vertical slice architecture (VSA) first, clean architecture (CA) where needed**.

That means:

- every meaningful product capability gets its own feature module
- modules are the primary structural unit
- inside a module, use clean architecture only when the domain or infrastructure variability justifies it

Do not force full CA into every trivial CRUD slice.

Use strategic DDD to discover boundaries and language: bounded contexts,
context maps, published language, customer/supplier relationships,
anti-corruption layers, and shared kernels. Use tactical DDD — aggregates,
entities, value objects, domain services, specifications — only where domain
complexity earns it. House doctrine is not an anemic-domain rule and not DDD purity.

#### When CA is warranted inside a module

Use ports/use-cases/domain types when at least one is true:

- the module has real business rules or invariants worth protecting
- infrastructure could realistically vary or be swapped
- orchestration would become hard to reason about inline
- testability matters because the capability is important or brittle

If none of those are true, stay simpler.

### Shared Kernel

Code in `shared/` or `Common/` belongs to no module; these rules keep it that way.

#### Shared/common rule

Shared locations exist for genuine cross-cutting concerns only.

Use them for:

- base error types
- common middleware/filters
- shared value types that are truly cross-module
- deliberately shared-kernel contracts

Do not use shared/common as:

- a dumping ground
- a backdoor around module boundaries
- a place to hide poorly named feature logic

#### Common/module shadowing

`Common/<Feature>/` must not mirror an existing `Modules/<Feature>/`. That
topology erases the feature's ownership even when several modules consume the
types. Organize genuine shared-kernel or host concerns by their shared role;
keep feature-owned published language with the feature.

### Standard Module Shape

#### .NET

```text
Modules/<Feature>/
├── Contracts/          # deliberately published module API, when needed
├── Domain/
├── Application/
│   ├── Ports/
│   └── <UseCaseName>/
│       └── <UseCaseName>UseCase.cs
├── Infrastructure/
├── <Feature>Controller.cs
└── <Feature>Module.cs
```

Rules:

- controllers live at the module root
- no `Interface/` folder by default
- ports live in `Application/Ports`
- infrastructure implements those ports
- module registration is explicit in `<Feature>Module.cs`

#### TypeScript

```text
src/modules/<feature>/
├── contracts/          # deliberately published module API, when needed
├── domain/
├── application/
│   ├── ports/
│   └── <use-case>.ts
├── infrastructure/
├── interface/http/<feature>-routes.ts
└── <feature>.module.ts
```

Rules:

- same dependency direction as .NET
- module registration is explicit in the module file (`<feature>.module.ts`)
- do not hide boundaries behind barrel files or magic provider discovery
- ports live in `application/ports`
- adapters live in `infrastructure`

### What Goes Where

#### Domain

Put in domain:

- entities/value objects if they earn their place
- pure rules
- invariants
- calculations
- policy decisions, including a lifecycle's decider (`Refusal` / `Available`)

Prefer plain data and pure functions for transformations. Put behavior on an
entity or aggregate when doing so protects lifecycle invariants and prevents
invalid mutation. Avoid inheritance-heavy domain models; methods themselves are
not the problem.

Do not put in domain:

- repositories
- HTTP
- database access
- framework imports
- SDK clients
- logging (`ILogger<T>` belongs in application and infrastructure; domain
  decisions are values, not log lines)

#### Application

Put in application:

- use cases
- orchestration
- ports
- each use case's own command and result types, beside it in its file

Application should make side effects visible in sequence.

#### Infrastructure

Put in infrastructure:

- EF/Prisma repositories
- HTTP clients
- queue adapters
- storage adapters
- auth provider integrations
- third-party SDK wrappers

Infrastructure may depend on frameworks and libraries freely.

### Common Failure Modes

Watch for these:

1. Shared dumping ground
- `Common/` or `shared/` starts absorbing feature logic

2. Cross-module leakage
- one module imports another module’s infrastructure or internal application types

3. Fake repositories everywhere
- ports with no real variability or boundary value

4. Application logic hiding in controllers
- transport layer becomes orchestration layer

5. Domain logic hiding in use cases
- business rules are inline `if/else` branches instead of explicit domain decisions
- the same guard is written in several use cases, in slightly different shapes

6. Rules re-derived by callers
- the UI or a second use case re-implements a guard instead of calling the
  decision or reading its projection; the copies drift and the UI offers
  actions the server refuses

7. Package/project sprawl
- splitting modules into separate packages before a real runtime or deployment boundary exists

### Enforcement

Document the rules, then enforce them.

#### .NET enforcement

Prefer architecture tests for:

- domain not depending on application/infrastructure
- application not depending on infrastructure
- modules not referencing sibling Domain/Infrastructure or non-public
  Application types
- required ports, published contracts, and shared-kernel dependencies following
  their declared ownership

#### TypeScript enforcement

Use whatever is lightest and enforceable:

- lint/import-boundary rules
- dependency-cruiser
- architectural tests
- workspace package boundaries where they are real

### Decision Heuristics

#### Should this become a new module?

Yes if:

- it is a real product capability
- it has its own language, workflow, or lifecycle
- it can be reasoned about as a bounded context

No if:

- it is only an infrastructure concern
- it is just a utility/helper
- it is an implementation detail of another module

#### Should this become a port?

Yes if:

- it crosses I/O or infrastructure boundaries
- there is plausible variability
- the use case should not know implementation details

No if:

- it is pure computation
- it is incidental indirection
- the abstraction is wider than the actual capability

#### Should this go in shared/common?

Yes if:

- it is genuinely cross-cutting
- it is a deliberately shared-kernel contract
- it is genuinely co-owned rather than required or published by one module

No if:

- it exists only because one module is leaking
- it would erase a meaningful feature boundary
