## What To Test

### Pure logic

If code is pure, test it directly.

That includes:

- transforms
- calculations
- rules
- validators
- mapping logic

These should usually be the cheapest and most stable tests in the codebase.

### Application / use case behaviour

Test use cases and feature flows at the level where real behaviour becomes visible.

Focus on:

- inputs
- outputs
- state transitions
- important side effects

Do not over-specify internal call choreography unless that choreography is itself the behaviour.

### Architecture boundaries

If the codebase depends on strict module boundaries, enforce them in tests.

Typical examples:

- module A may consume module B only through a consumer-owned required port, a
  provider-owned published contract, or a deliberate shared kernel
- no dependency on another module's infrastructure
- no dependency on another module's internal application types

If the boundary matters enough to talk about repeatedly, it usually matters enough to test.

Every .NET project that owns a `Modules/` tree needs mechanical coverage through
one of: [`Meridian.Analyzers`](https://github.com/maxanstey-meridian/plumb/tree/main/dotnet/Meridian.Analyzers),
architecture tests that actually execute ArchUnitNET/NetArchTest rules, or
CI/task/script automation that invokes [Plumb](https://github.com/maxanstey-meridian/plumb).
An analyzer attached only to an unrelated project, a package with no execution,
or a declared architecture rule that is never checked does not cover the modular
project.

### Infrastructure

Test infrastructure directly when:

- the adapter is non-trivial
- the mapping is important
- failure handling matters
- the external contract is brittle

Do not wrap every trivial adapter in heavy bespoke tests just because it exists.
