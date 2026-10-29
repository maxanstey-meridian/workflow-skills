# Backend PA/VSA

## Purpose

Use this when designing, reviewing, or refactoring a backend toward a modular-monolith shape with:

- vertical slice architecture at the module boundary
- clean architecture applied inside modules where it earns its place
- ports and adapters for external variability
- strict dependency direction

This is the Meridian backend default for both:

- .NET modular monoliths
- TypeScript modular backends (Hono + `typed-inject` by default; Nest where a repo already uses it)

It is distilled from the house's .NET and TypeScript modular monoliths and their architecture tests.

## Default Recommendation

Build a **single-project or single-package modular monolith** first.

Do not start with:

- flat service folders
- giant `common/services`
- many tiny packages/projects
- fake microservice boundaries

The stable boundary is the **module**, not the class and not the package.

## Core Principle

Use **VSA first, CA where needed**.

That means:

- every meaningful product capability gets its own feature module
- modules are the primary structural unit
- inside a module, use clean architecture only when the domain or infrastructure variability justifies it

Do not force full CA into every trivial CRUD slice.

Use strategic DDD to discover boundaries and language: bounded contexts,
context maps, published language, customer/supplier relationships,
anti-corruption layers, and shared kernels. Use tactical DDD — aggregates,
entities, value objects, domain services, specifications — only where domain
complexity earns it. Meridian is not an anemic-domain rule and not DDD purity.

### When CA is warranted inside a module

Use ports/use-cases/domain types when at least one is true:

- the module has real business rules or invariants worth protecting
- infrastructure could realistically vary or be swapped
- orchestration would become hard to reason about inline
- testability matters because the capability is important or brittle

If none of those are true, stay simpler.

## Non-Negotiable Dependency Rules

These are the hard rules.

### Inside a module

- `Domain` depends on nothing outside itself
- `Application` may depend on `Domain`
- `Application` must not depend on `Infrastructure`
- `Infrastructure` implements `Application/Ports`
- interface/transport/controllers call application services or use cases only
- controllers and endpoint adapters never call, inject, inherit from, or store
  another controller; share the underlying Application capability instead

### Across modules

Modules must not depend on sibling internals: never import another module's
`Domain` or `Infrastructure`, query its tables, or reach into non-public
application types. Cross-module collaboration must name both ownership and
direction explicitly.

There are three valid integration shapes:

- **consumer-owned required port** — module A defines the narrow capability it
  needs; a host/integration adapter bridges that port to module B
- **provider-owned published contract** — module B deliberately exposes a
  stable command/query contract that sibling Application code or host/integration
  composition may call; Domain never consumes a sibling contract
- **shared kernel** — two or more modules genuinely co-own a small, stable
  concept; that concept lives in Common and changes only by joint agreement

Required ports do not move to Common merely because their implementation calls
another module. Published contracts do not expose a module's internal domain
model. Integration wiring at the host edge may depend on both sides; feature
modules depend only on the contract relevant to their side.

### Published contract closure

Published contract source is closed over published or genuinely shared types.
Files under `Modules/<Feature>/Contracts/` and top-level transport
`Contracts/<Feature>/` must not reference module Domain, Application,
Infrastructure, or presentation types. Move wire-facing enums, records, and
value shapes into the owning contract and map at the edge; C# `public`
accessibility does not make an internal domain type published language.

Provider-published module contracts may be consumed by Application,
integration, and transport contract code. Domain never consumes a sibling
contract. Top-level transport contracts still own their direct request and
response DTOs rather than using Application commands, results, controller
types, or module contracts as route payload roots.

The reverse direction is closed too: a module's Contracts, Domain, Application
and Infrastructure never reference the top-level transport contracts
(`<App>.Contracts.*`), and no `global using` brings them in. The transport edge
(`Contracts/**/…TransportMapper` and the module-root presentation files:
controllers, endpoints, transport mappers, request validators, the module's
registration) maps to and from module types; module code never takes or
returns a wire DTO.

This is dependency inversion applied to module integration: the consumer owns
the shape of what it requires, while a provider owns the shape of what it
publishes. `Common` is not an owner-erasure mechanism.

**Module-merge heuristic**: if two modules repeatedly need each other's
internal concepts or require atomic changes to both models, the boundary is
probably false. Merge or redraw it rather than accumulating integration ports.
A "module" every other module needs but that owns no product capability is an
infrastructure concern wearing a module costume.

### Shared/common rule

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

### Common/module shadowing

`Common/<Feature>/` must not mirror an existing `Modules/<Feature>/`. That
topology erases the feature's ownership even when several modules consume the
types. Organize genuine shared-kernel or host concerns by their shared role;
keep feature-owned published language with the feature.

## Standard Module Shape

### .NET

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

### TypeScript

```text
src/modules/<feature>/
├── contracts/          # deliberately published module API, when needed
├── domain/
├── application/
│   ├── ports/
│   └── <use-case>.ts
├── infrastructure/
├── <feature>.controller.ts
└── <feature>.module.ts
```

Rules:

- same dependency direction as .NET
- module registration is explicit in the module file (`<feature>.module.ts`)
- do not hide boundaries behind barrel files or magic provider discovery
- ports live in `application/ports`
- adapters live in `infrastructure`

## Ports and Adapters

Ports should be:

- narrow
- capability-shaped
- owned by the application layer

Prefer:

- `UserRepository`
- `PasswordHasher`
- `PaymentGateway`
- `FeatureToggleProvider`
- `WorkflowStarter`

Avoid:

- giant “service” ports
- ports that just mirror an infrastructure SDK
- abstraction with no plausible second implementation or no meaningful boundary

### TypeScript port convention

Ports are abstract classes with a private constructor: a type adapters
`implement` but can't `extend` or instantiate, and, under Nest, the runtime DI
token.

The abstract should be effectively stateless and interface-like:

- no fields
- no implementation
- no static factory logic
- no non-abstract methods
- a `private constructor()` so it cannot be instantiated or extended accidentally as a real base type

Example:

```ts
export abstract class Mailer {
  private constructor() {}

  abstract send(input: SendMailInput): Promise<void>;
}
```

Concrete adapters should `implement` the port, not `extend` it.

Example:

```ts
export class SendgridMailer implements Mailer {
  async send(input: SendMailInput): Promise<void> {
    // ...
  }
}
```

Treat these ports as types with interface semantics (and, under Nest, DI keys), not as OO base classes.

When two adapters want shared behavior, the answer is composition — a shared
module of pure functions both adapters call — never a base adapter class. The
port's private constructor makes `extends` impossible on purpose; do not
reintroduce inheritance beside it with an `AbstractBaseMailer`.

### TypeScript naming conventions

Ports are named after the capability itself:

- `Mailer`
- `PasswordHasher`
- `WorkflowStarter`
- `UserRepository`

Adapters are named after the concrete implementation of that capability:

- `SendgridMailer`
- `BcryptPasswordHasher`
- `TemporalWorkflowStarter`
- `PrismaUserRepository`

File naming: **no type-tag suffixes — the directory carries the role, the file
is named after the thing.** (`.port.ts`, `.service.ts`, `.provider.ts`,
`.use-case.ts`, `.interface.ts`, `.handler.ts` are all banned — tagging one
kind implies tagging them all, so none are tagged. HTTP route
registration is a suffix-free `interface/http/<module>-routes.ts`.)

- ports: `application/ports/mailer.ts`, `application/ports/user-repository.ts`
  — named after the capability; the `ports/` dir already says what they are
- adapters: `infrastructure/sendgrid-mailer.ts`,
  `infrastructure/prisma-user-repository.ts` — named after the implementation
- use cases: `application/create-form.ts` (or `application/use-cases/create-form.ts`)
- sole exception: `<feature>.module.ts` — the composition-root idiom
- test/config dotted names (`.spec.ts`, `.test.ts`, `.config.ts`, `.d.ts`) are
  not type tags

Do not use vague names like:

- `MailerService`
- `MailerInterface`
- `DefaultMailer`
- `BaseMailer`

### Cross-module collaboration

Use a consumer-owned required port when the consuming use case should control
the dependency shape. Use a provider-owned published contract when the provider
is intentionally offering a stable capability to several consumers. Put only a
genuine shared kernel in Common.

Do not import another module's internal types just because the compiler allows
it. Keep integration translation at the host edge so neither module absorbs the
other's model.

## Coding Style Rules

These are part of the architecture, not just aesthetics.

### General

- data transforms over object hierarchies by default
- explicit orchestration over magic
- readability over abstraction
- top-to-bottom understandable use cases
- minimal dependencies

### .NET

- `sealed` on all concrete types
- records for DTOs, commands, results, value objects
- EF entities may be `sealed class` rather than records
- explicit `IServiceCollection` registration
- no MediatR
- no AutoMapper
- no DI auto-scanning
- use cases named `<UseCaseName>UseCase`
- colocate `Command` and `Result` with the use case — as sibling records (see
  Commands and Results below)

Every class named `*UseCase` declares `ExecuteAsync`, and every `ExecuteAsync`
declaration carries a top-level `CancellationToken` parameter. A token nested in
another generic or options type does not propagate cancellation.

Domain and Application never receive `System.IServiceProvider`.
[Plumb](https://github.com/maxanstey-meridian/plumb)'s lexical checker detects provider fields and constructor/method parameters; the Roslyn
analyzer additionally resolves `GetService` and `GetRequiredService` calls on
`System.IServiceProvider` and Microsoft DI extension methods. Composition
resolves dependencies; business layers receive explicit constructor dependencies.

Recommended use case signature:

```csharp
Task<CreateFormResult> ExecuteAsync(CreateFormCommand command, CancellationToken cancellationToken)
```

### Commands and Results

Command and Result records are **siblings of the use case in the same file**,
never nested inside the use case class. (Older code may nest them as
`CreateFormUseCase.Command`; un-nest when you touch it.)

```csharp
public sealed record CreateFormCommand(string Name);
public sealed record CreateFormResult(Guid Id);

public sealed class CreateFormUseCase { /* ... */ }
```

Sibling records keep call sites readable (`CreateFormCommand`, not
`CreateFormUseCase.Command`) and keep the use case class purely behavioral.

### Validation

Validate at the boundary that owns the contract:

- transport parsing and binding → transport edge
- command shape and semantic validity → Application, especially when HTTP,
  queues, jobs, and tests can all invoke the same command
- state invariants → Domain
- uniqueness and referential rules → Application orchestration backed by
  authoritative database constraints
- authorization → normally an Application policy using actor and resource
  context; Domain only when permission is intrinsic to the state transition

FluentValidation is the default for request/command shape validation. Register
validators explicitly; no assembly scanning. Do not duplicate the same rule in
transport and Application: HTTP-only request validation may stay at the edge,
while reusable commands own reusable validation.

### Validation error codes

Every FluentValidation validator that can produce a failure declares an
explicit `.WithErrorCode(...)` for that validator. Error codes are machine-facing
contract values; a message or FluentValidation's validator-name default is not
a stable API code. In a chain with several validators, each validator owns its
own code.

Delegation through `SetValidator` and `ChildRules` does not add a failure at the
outer call site; the delegated or nested rules own their codes. Reusable custom
validator extensions likewise own the codes they produce. `Custom` callbacks
must set codes on failures themselves, but that callback behavior is not
mechanically inferred from the call site.

### Results vs exceptions

**Declared failures are results;
undeclared failures are exceptions.** If the contract declares the failure
(`.Returns<ErrorResponse>(4xx)`), the use case returns it as a value and the
endpoint maps it — declared failures are control flow the caller must handle,
and values make that visible. Exceptions are reserved for "this should never
happen" and are translated once by the error middleware. Do not throw for
outcomes the API contract promises; do not return result objects for genuine
programmer errors.

FluentResults (`Result` / `Result<T>`) is the default Application result carrier
when a use case has a small open set of ordinary failures. It is not Domain
furniture. Domain decisions with a closed set of meaningful outcomes should
return domain-specific result records or sealed outcome types so callers can
handle them explicitly. Do not hand-roll a generic Result library per repo.

A decider's refusal (`invariants-and-concurrency.md`, Deciders) is such a closed
domain outcome. Each decider has one mapping from refusal to declared failure,
which owns the error codes and wording, and every use case goes through it. Do not
construct the failure for a refusal at the call site.

Authorization follows the same split: authentication is transport (middleware);
authorization is a business invariant decided in the use case — never in
controllers.

### Error Envelope

The canonical API error shape is one general envelope:

```csharp
public sealed record ErrorResponse(string Code, string Message,
    IReadOnlyDictionary<string, string[]>? Errors = null);
```

One type serves every declared failure —
`.Returns<ErrorResponse>(422)` in contracts and one conversion at the transport
edge. No `*Dto` suffix, and no special-purpose variants like
`ValidationErrorDto`: validation failures are the same envelope with `Errors`
populated. The pipeline is: use case returns a declared failed result → the
transport edge maps it to `ErrorResponse` once → the frontend matches on
`Code`. Undeclared exceptions go through global exception handling and become
a 5xx response. Do not support both exceptions and failed results for the same
expected outcome.

### TypeScript style

- strict typing
- narrow ports as abstract classes with private constructors
- concrete adapters `implement` ports
- prefer constructor property promotion for injected dependencies
- explicit provider wiring
- no hidden framework abstraction layers

Example:

```ts
export class TickPet {
  public static inject = [
    "clock",
    "getWindowTitle",
    "petEffects",
    "petStateMachine",
    "petStatePersistence",
  ] as const;

  public constructor(
    private readonly clock: Clock,
    private readonly getWindowTitle: () => string | null,
    private readonly petEffects: PetEffects,
    private readonly petStateMachine: PetStateMachine,
    private readonly petStatePersistence: PetStatePersistence,
  ) {}

  public async execute(input: TickPetInput): Promise<PetState> {
    // ...
  }
}
```

Prefer:

- `public static inject = [...] as const` for `typed-inject`-assembled classes
- constructor property promotion for long-lived injected dependencies
- `private readonly` by default
- `protected readonly` only when there is a real inheritance reason

Avoid:

- constructor args assigned manually to fields for no reason
- grabbing dependencies from service locators inside methods
- mutable injected dependency fields
- barrel-heavy indirection that hides provenance
- framework or transport details in domain/application

Production source reads environment only in root configuration/bootstrap owners:
`config.ts`, `config.mts`, `config.cts`, `config/**`, `bootstrap.ts`,
`bootstrap.mts`, `bootstrap.cts`, or `bootstrap/**`, each optionally under
`src/`. In a workspace monorepo, each package root (directory with its own
`package.json`) is treated as a project root for owner matching — so
`server/src/config.ts` is an owner just as `src/config.ts` is in a
single-package repo. Module-local folders with those names are not owners.
Build-tool config files (`vite.config.ts`, `nuxt.config.ts`, `vitest.config.ts`,
etc. — any `*.config.{ts,mts,cts}` at a package root) are build-time tooling,
not production runtime source. Outside those roots, do not read `process.env`,
`globalThis.process.env`, `Bun.env`, `Deno.env`, or import named `env` from
`process`/`node:process`; inject the validated config object.

## What Goes Where

### Domain

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

### Application

Put in application:

- use cases
- orchestration
- ports
- DTOs/results local to the use case when appropriate

Application should make side effects visible in sequence.

### Infrastructure

Put in infrastructure:

- EF/Prisma repositories
- HTTP clients
- queue adapters
- storage adapters
- auth provider integrations
- third-party SDK wrappers

Infrastructure may depend on frameworks and libraries freely.

## Persistence

One host-level DbContext is acceptable as the persistence
root — but each module owns its entities' mapping:

- `IEntityTypeConfiguration<T>` implementations live in the owning module's
  `Infrastructure/` (`Modules/<X>/Infrastructure/Persistence/`)
- a module never configures another module's entities, and never centralises
  mapping next to the DbContext
- cross-module data access uses a required port or published query contract;
  module X never queries module Y's entities, DbSets, or tables directly
- migrations are host-level (they serialize the whole model), but the model
  itself is assembled from module-owned configurations

## Consistency, Concurrency, and Events

`invariants-and-concurrency.md` is authoritative for invariant enforcement,
concurrency admission, escalation, proof, locks, queues, workflows, and outboxes.
Apply it before selecting persistence or messaging infrastructure.

Backend placement consequences:

- Domain owns state invariants and closed business decisions; Application owns
  orchestration, idempotency semantics, transaction boundaries, and failure
  interpretation.
- Infrastructure implements persistence, arbitration, and transport through the
  database or an established library. Expected constraint conflicts are outcomes,
  not accidental infrastructure failures.
- One invariant requiring repeated atomic changes across two modules is evidence
  that their boundary may be false; redraw it before adding coordination ports.
- **Domain events** are in-memory facts produced by a domain decision and require
  no queue. **Integration events** are durable published contracts crossing a
  module or service boundary.
- Explicit event collection and dispatch is the in-process default. Durable
  messaging infrastructure earns its place only when the required consistency
  model crosses the process boundary.
- A database transaction cannot make an HTTP API atomic. Accept explicit
  reconciliation or use a justified durable workflow with idempotent external
  activities.

## Resilience and Time

- cancellation flows from transport through Application to every adapter
- timeouts, retries, and circuit breaking live at volatile infrastructure
  boundaries
- never retry a non-idempotent operation blindly
- inject `TimeProvider` / a Clock port when business behavior depends on time
- stamps too: one injected clock everywhere in production code, adapters and SQL
  included (no `DateTime.UtcNow`, no `now()` in queries), so a test that fixes the
  clock fixes every comparison
- keep transport retry policy separate from business compensation policy

## Security and Evolution

- authentication is established at the transport edge; authorization decisions
  happen where actor, resource, and operation context are available
- tenant and ownership filters are server-side invariants, never UI assumptions
- secrets enter through validated configuration and never domain/application
  values unless the use case explicitly operates on a secret
- audit events record security-relevant outcomes without leaking sensitive data
- database migrations and public contracts use expand-contract evolution when
  old and new versions can coexist during deployment
- integration messages are append-only published contracts; additive evolution
  is the default, and breaking changes require explicit versioning
- a shared definition that other things consume (a template, list, boundary,
  type or schema) has published, immutable versions; every consumer, its draft
  included, pins the version it uses and moves to a newer one only by an explicit
  action that shows what changes. Freezing a copy when the consumer publishes is
  not enough: a draft must not shift under its author. Runtime settings
  (credentials, endpoints, on/off) are not definitions and stay live

## Use Cases vs Direct Services

Do not cargo-cult a use case class for every trivial operation.

Use a full use case when:

- the flow coordinates multiple side effects
- there is meaningful sequencing
- the capability matters enough to deserve a named orchestration boundary

If the behavior is genuinely simple and procedural, a direct service may be enough.

The key test:

- does this boundary improve clarity and protect business behavior?

If yes, keep it.
If not, simplify.

## CQRS-Lite

Prefer CQRS-lite over repository-as-everything.

Repositories are primarily write-side consistency ports. They load the state
needed to perform a mutation and persist its result. Queries own read shapes:
list rows, dropdown options, exports, dashboards, and API projections belong to
named queries rather than the write repository.

Read-shaped repository methods (`Get`, `List`, `Find`, `Search`, `Read`,
`Query`, `Exists`, `Count`) are persistence-pure. They do not add, update,
delete, or save entities as a hidden consequence of reading. If an operation
intentionally reads and writes, give it a mutation-revealing name and treat it
as a command-side capability.

A trivial query may hydrate through a repository and map locally. If the read
becomes wider, slower, or UI-specific, replace the query implementation with a
direct projection without changing the write repository contract.

Mechanical review of this boundary is intentionally naming-based: repository
methods prefixed `Get`, `List`, `Find`, `Search`, `Read`, or `Query` and returning
`*Dto`, `*Row`, `*View`, `*Projection`, or `Paged*<...>` deserve ownership review.
That is a heuristic, not proof of leakage; mutation receipts and legitimate
Application-owned DTOs remain valid.

Use cases/commands orchestrate mutations. Policies make decisions. Transitions
transform state. Repositories load/save write-side state. Queries return
read-shaped data. Use explicit calls and dependencies; CQRS-lite does not
require MediatR, a command bus, or an ambient dispatcher.

Rules the client needs travel on the read model. A detail read model for a
lifecycle entity carries `availableActions`, computed by the same decider the
use cases guard with. A page needing a single server decision gets a named flag
(`canPost`, `hasUnpublishedChanges`) computed by the same function the write side
uses. App-wide permissions travel the same way: the session carries
capabilities computed from the named authorization policies the endpoints use.
If a client would otherwise compare status strings, timestamps, counters,
version lists or roles to work out what the user may do, the read model is
missing a field.

## Common Failure Modes

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

## Enforcement

Document the rules, then enforce them.

### .NET

Prefer architecture tests for:

- domain not depending on application/infrastructure
- application not depending on infrastructure
- modules not referencing sibling Domain/Infrastructure or non-public
  Application types
- required ports, published contracts, and shared-kernel dependencies following
  their declared ownership

### TypeScript

Use whatever is lightest and enforceable:

- lint/import-boundary rules
- dependency-cruiser
- architectural tests
- workspace package boundaries where they are real

The point is not tooling purity. The point is to stop the drift.

## Decision Heuristics

### Should this become a new module?

Yes if:

- it is a real product capability
- it has its own language, workflow, or lifecycle
- it can be reasoned about as a bounded context

No if:

- it is only an infrastructure concern
- it is just a utility/helper
- it is an implementation detail of another module

### Should this become a port?

Yes if:

- it crosses I/O or infrastructure boundaries
- there is plausible variability
- the use case should not know implementation details

No if:

- it is pure computation
- it is incidental indirection
- the abstraction is wider than the actual capability

### Should this go in shared/common?

Yes if:

- it is genuinely cross-cutting
- it is a deliberately shared-kernel contract
- it is genuinely co-owned rather than required or published by one module

No if:

- it exists only because one module is leaking
- it would erase a meaningful feature boundary

## Short Version

If in doubt:

1. start with a modular monolith
2. make modules the primary boundary
3. keep domain pure
4. keep application explicit
5. put ports in application
6. let infrastructure implement them
7. integrate modules through required ports or published contracts
8. reserve shared/common for a genuine shared kernel or truly cross-cutting
   host infrastructure
9. avoid magic and unnecessary abstraction
10. enforce the rules with tests or linting once the codebase is big enough

## Observability

Domain stays silent: domain decisions produce values and events, not log lines.
Transport records request-level telemetry; Infrastructure records database and
external-call telemetry. Application operations may be traced and measured
with business context, preferably through decorators around use cases rather
than scattered log statements.

Use OpenTelemetry-compatible traces, metrics, and structured logs. Composition
decides which exporters exist per environment. Observability must preserve
dependency direction: no ambient static logger and no telemetry-driven business
behavior.
