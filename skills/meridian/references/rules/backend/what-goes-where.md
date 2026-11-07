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
