# Testing Philosophy

## Purpose

Use this when deciding what to test, how to test it, and how much test structure a change has earned.

This is the Meridian default for backend and frontend testing.

## Core Principle

Test **behaviour and boundaries**, not incidental implementation detail.

The goal is:

- confidence through refactor-safe tests
- fast feedback on real regressions
- minimal mock soup
- explicit testing at the seams that matter
- tests as close to the metal as practical

## Default Bias

Prefer:

- pure logic unit tests
- integration and lifecycle tests at real seams
- architecture tests where boundaries matter
- outcome-based assertions

Avoid:

- tests that mirror implementation line-by-line
- mock-heavy tests of internal call sequences
- giant setup for small behaviour
- tests that break every time code is rearranged

For LLM-authored code especially, the safest default is:

- think through the behaviour
- write the real thing
- test the actual behaviour

Do not default to building the test around mocks first.

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

## Near-Metal Rule

Keep tests as close to the real runtime path as practical.

That usually means:

- prefer real wiring over mocked wiring
- prefer real feature flows over isolated call-sequence tests
- prefer lifecycle/integration tests over synthetic unit shells when the behaviour crosses a seam

The default question is:

- “Can this be tested through the real boundary instead?”

If yes, do that.

## Backend Bias

Prefer:

- unit tests for pure domain/application logic
- integration tests for real use case flows
- architecture tests for module rules
- focused infrastructure tests for adapters with meaningful behaviour

Avoid:

- mocking every repository and dependency by default
- MediatR-style handler micro-tests that prove nothing
- repository tests that only restate ORM behaviour

## Frontend Bias

Prefer:

- direct tests of pure `logic/`
- composable tests where state/orchestration matters
- page-level integration tests where wiring matters
- user-visible outcome assertions

Avoid:

- mock-heavy component tests for internal details
- treating presentational components as the main testing surface
- mounting half the app just to test a pure rule that should have lived in `logic/`

## Mocks

Mocks are allowed, but they should isolate volatility, not replace the whole world.

Default stance:

- do not mock unless there is a concrete reason
- prefer the real dependency if it is cheap enough
- prefer a fake only when the real thing is too heavy, slow, unstable, or operationally awkward for the test

Good reasons to mock:

- non-deterministic external systems
- expensive boundaries
- unstable infrastructure
- rare failure cases

Good reasons to use a fake:

- storage or transport is too heavy for the test but the behavioural contract still matters
- a cheaper in-memory implementation can exercise the same capability honestly
- the real dependency would make the test operationally brittle

A fake covers behavior above the port; it does not cover the real adapter.
Where semantic drift is plausible, run the same behavioral contract tests
against the fake and every real adapter.

Bad reasons to mock or fake:

- avoiding proper seams
- testing internal call order instead of behaviour
- making tightly coupled code appear testable
- making the test easier to write at the cost of realism

## Test Doubles

The default double is a **hand-rolled fake**; a mocking
library (NSubstitute, `vi.mock`) stays legal at narrow seams — density is the
smell, not presence. A file built from many `Substitute.For<>` calls is mock
soup; one substitute at a genuinely volatile boundary is fine.

Conventions:

- doubles live in `TestSupport/{Module}/`; in a TypeScript test tree, a
  lowercase `support/` folder inside it (`tests/support/`, `test/support/`)
- naming vocabulary: `Fake*` (behavioral fake), `InMemory*` (in-memory
  implementation of a storage/transport port), `Inline*` (synchronous stand-in
  for an async dispatcher). Never `Mock*`/`Stub*` for hand-rolled doubles — the
  name should say what the double *is*, not that it is a double of some kind
- test classes build their subject through a private `CreateUseCase()` factory
- inject `TimeProvider` (or the `Clock` port) rather than reading time ambiently

A stand-in API response (a Playwright `route.fulfill` body, a mocked client
result) is typed against the generated contract, with
`satisfies components["schemas"]["…"]` or a typed fixture helper, so a contract
change breaks the test at compile time instead of leaving it to drift.

## Test Substrate

Integration tests run on the production database engine. `UseInMemoryDatabase`
is banned anywhere in test source — the EF InMemory provider validates neither
SQL nor relational behavior (no FK enforcement, no real query translation), so it
manufactures confidence. SQLite is not a substitute for PostgreSQL-specific
SQL, collation, transaction, or concurrency behavior. Use Testcontainers. A
good fixture starts one PostgreSQL container for the whole run, migrates a
template database once, gives each test fixture its own database copied from
that template (`CREATE DATABASE … TEMPLATE …`), and resets data between tests
with [Respawn](https://github.com/jbogard/Respawn), so tests stay isolated
without paying for a container or a migration per fixture. The near-metal rule
applies: if the adapter behavior under test touches PostgreSQL, the test should
touch PostgreSQL.

If a test wants to avoid persistence entirely, the fake goes at the
**repository/query port**, never underneath the real adapter as a fake
database. Either the test exercises the real adapter against a real engine, or
it fakes the port and the adapter isn't under test at all — there is no honest
middle.

The mechanical check reports at most one finding per provider kind per test file:
one for EF InMemory and, independently, one for SQLite when the test project
references a production Postgres/Npgsql project directly or transitively.

Tests themselves are exempt from production-code rules (layer purity, module shape,
.NET style):
test code can import whatever it needs; it is judged by this file's standards
(double vocabulary, mock density, location), not by production-code rules.

## Concurrency Proof

`invariants-and-concurrency.md` owns concurrency admission and escalation. Tests
must prove the invariant and concrete interleaving at the real arbitration
boundary rather than merely verify calls to a lock, repository, or queue.

- Coordinate actors deterministically with barriers, hooks, or controlled
  transactions; do not use timing sleeps as proof.
- Assert durable winner, loser, retry, and conflict outcomes.
- Exercise database constraints, conditional writes, isolation, and locking on
  the production database engine.
- Exercise queue, inbox/outbox, and workflow behavior through the real adapter
  where their delivery guarantees are the subject.
- A fake can prove caller policy above a port; it cannot prove arbitration,
  atomicity, ordering, redelivery, or lock-loss behavior of the real adapter.

## Test Location

Frontend tests live in a top-level `tests/` directory at
the frontend root, mirroring source structure — not colocated `__tests__/` dirs
and not specs scattered beside source files. A Playwright suite may instead sit
in a top-level `e2e/` beside it (Playwright's own suggested name). A TypeScript API or
library keeps its tests in a top-level `test/` or `tests/` directory at its package root.
Backend tests live in the conventionally named sibling test project (`*.Tests`).

## Coverage Honesty

A green suite that tests the wrong things proves nothing.

Every materially different outcome introduced by a change (e.g. the
404/422/success mapping of a new endpoint) needs evidence at the cheapest honest
level. Several implementation branches producing one behavior do not
necessarily need separate tests. Covering the assembler, wiring, or setup does
not cover the use case that calls it.

A test using a fake or mock can cover the subject's behavior, but it does not
cover the substituted adapter. State that scope honestly. Verifying only the
double's calls, rather than an observable result or state transition, usually
manufactures confidence.

## Risk and Test Shape

Do not pursue one universal test pyramid or direct branch coverage quota. Match
the test to the failure risk:

- pure decision errors → focused unit tests
- application orchestration errors → behavior tests through ports
- persistence/protocol errors → real adapter integration tests
- wiring errors → host/page composition tests
- critical user journeys → a small number of end-to-end tests

## Smell Checks

A test strategy is probably wrong if:

- a small behaviour needs huge setup
- most assertions are about how code was called rather than what happened
- tests break whenever code is rearranged but behaviour is unchanged
- boundaries are constantly discussed in reviews but never enforced in tests
- the test suite is mostly mocks with very little real behaviour exercised
- new decision branches or error paths have no direct test exercising them

## Summary

The intended testing style is:

- pure logic tested directly
- behaviour tested at the level it becomes visible
- real seams tested with integration
- lifecycle and integration tests preferred over mock-heavy isolation by default
- fakes only when a heavy dependency genuinely forces the issue
- important architecture rules enforced
- minimal implementation-detail obsession
