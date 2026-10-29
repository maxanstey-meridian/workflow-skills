# Coding Philosophy

## Purpose

Use this when making design decisions, choosing abstractions, reviewing trade-offs, or deciding whether a refactor or seam is justified.

This is the Meridian cross-cutting default.

For concrete structural patterns, see:

- `backend-pa-vsa.md`
- `frontend-pa-vsa.md`

## Core Rule

Prefer explicit, honest code over clever, magical, or abstraction-heavy code.

The job is to make:

- ownership obvious
- provenance obvious
- dependency direction obvious

## Rule Strength

Every Meridian statement belongs to one of four strengths:

- **Law** — protects correctness, ownership, or dependency direction; a
  violation is a bug. If valid context contradicts it, the statement was a
  default or the checker produced a false positive, not a waived law
- **Default** — the preferred greenfield choice; replace it when the local
  constraint clearly points elsewhere
- **Preference** — house consistency with no claim of architectural necessity
- **Tooling** — a current replaceable implementation choice

Mechanical checks may fail builds only for laws and mechanically provable
correctness constraints. Defaults should warn, preferences should inform, and
tooling rules should remain easy to update. Do not give a filename convention
the same authority as an atomicity or dependency rule.

## Coding Style

Defaults unless the item states a hard boundary:

- **Data transforms over object hierarchies** — prefer plain `type` (TS),
  `sealed record` (C#), object spread, and pure functions. Behavioral entities
  are correct when their methods protect lifecycle invariants; inheritance-heavy
  domain models are not. For the enforcement ladder and concurrency admission
  policy, read `invariants-and-concurrency.md`.
- **Minimal dependencies** — every package must earn its place. The absence of a dependency is a feature, not a gap.
- **Let patterns prove themselves** — prefer duplication over premature extraction. Three similar lines beats a premature helper. Extract when the pattern is real, not when it first appears.
- **Readability over abstraction** — procedural scripts that read top-to-bottom beat clever composition. A reader should understand each line without holding the abstraction in their head.
- **No `process.env` directly** — use the validated config object. Add new env vars to the Zod schema (`src/config.ts` or equivalent). Ambient config access is untraceable.
- **No self-narrating comments** — do not add comments that restate what the code plainly says. A comment earns its place only by explaining WHY: a non-obvious constraint, a design decision, or a real gotcha. Stream-of-consciousness narration ("now loop over the items") and notes-to-self are noise. When in doubt, leave it out.

## Use Libraries Before Building Machinery

**Default:** do not hand-roll infrastructure, security protocols, wire clients,
serialization formats, schedulers, storage clients, authentication flows, or
other general-purpose machinery when a suitable maintained library, framework,
official SDK, or generated client already exists.

“Minimal dependencies” cuts both ways. A package must earn its place, but custom
machinery must also justify the permanent implementation, security, testing,
upgrade, and operational burden it creates. Avoiding one dependency is not a win
when it makes the application maintain a private, incomplete implementation of a
solved problem.

Before writing custom machinery:

1. Identify the established framework capability, official SDK, maintained
   library, or authoritative generated-client option.
2. Check whether it satisfies the actual correctness, security, licensing,
   deployment, observability, failure, and retry requirements.
3. Use it behind the owning module's honest application port when semantic
   translation or dependency inversion is required. Keep third-party types and
   exceptions at the Infrastructure edge.
4. Configure or disable library behaviour that conflicts with application
   invariants, especially hidden retries, transactions, caching, or background
   execution.
5. Hand-roll only when no suitable option exists or a concrete hard requirement
   cannot be met. Record the exact disqualifying constraint and test the custom
   surface as infrastructure, not as incidental helper code.

The application still owns its product rules, capability contracts, idempotency
semantics, transaction boundaries, failure interpretation, and orchestration.
The database or established library owns concurrency arbitration and atomic
persistence mechanics; `invariants-and-concurrency.md` defines that boundary.
The library owns commodity protocol and runtime mechanics. Do not fork an SDK's
job into application code, and do not wrap a library one-for-one merely to hide
that it is a dependency.

This default does not require a package for every small pure function. A
dependency is unsuitable when its scope, runtime cost, maintenance state, or
semantic mismatch outweighs the small and fully understood code it would
replace. The distinction is commodity machinery versus local product logic, not
large code versus small code.

## Decision Rule

When asked what is right, better, best, default, or proper:

- answer from principles first
- assume greenfield unless constrained otherwise
- separate best architecture from best migration step

Do not confuse:

- “consistent with the current codebase”

with:

- “the right default”

## Seams

Seams must be earned.

Introduce a seam only when there is real:

- variability
- runtime boundary
- ownership boundary
- testability need
- cross-module dependency concern

Do not introduce seams just because the pattern exists.

Fake abstractions are worse than direct code.

## Root Cause

Fix root causes before adding shims.

Prefer fixing:

- the real boundary
- the real model
- the real config
- the real dependency direction

Use shims only as deliberate, temporary last resorts.

**Law: a gap with a doc page is still a gap.** Writing a problem down does not
resolve it. A decision record, an `INVARIANTS.md` `Accepts`, a changelog "known
issue", a README caveat or a code comment never stands in for a fix.

- A **gap** is something wrong, unenforced or unchecked that could be fixed: a
  promise nothing verifies, an entry point outside a guard, a false positive, a
  rule that holds only "because no caller does X today".
- A **trade-off** is a cost chosen over a working alternative, for a stated
  reason, such as one more indexed query per cache miss rather than building
  stampede protection. Only trade-offs go under `Accepts`.
- The test: would we welcome a change that removed it at no other cost? If yes,
  it is a gap. When the work in hand caused or promised it, fix it in this
  change, in the library or module that owns it if necessary, and widen the
  scope to do so.
- If it truly cannot be fixed now, it goes to the user as an open decision with
  a recommendation, not into a doc as settled. A doc may say a gap exists only
  while a tracked fix for it is open, and names that fix.
- **Trivial gaps are never parked.** A gap found outside the work in hand is
  fixed on the spot when the fix is trivial: mechanical, a few lines, no design
  call. A non-trivial one is new work: tell the user and list it under
  **Parked** in your report; don't fix it in passing.

## Local Before Shared

Keep things local until they are genuinely shared.

Promote something only when it has:

- more than one real consumer
- stable enough ownership
- clearer shared value than local duplication

Do not create shared dumping grounds.

Shared use does not erase ownership. A capability used by several consumers may
still belong to one feature or bounded context. Move code to a shared kernel
only when ownership is genuinely shared; otherwise expose a public contract or
keep the implementation with its owner.

## Provenance

Names and file boundaries should reveal what a thing really is.

Prefer:

- capability names
- concrete implementation names
- direct imports from the real owner
- explicit registration and wiring

Avoid:

- vague names like `manager`, `helper`, `service`, `provider`
- wrapper layers that hide the real dependency
- re-export structures that hide provenance

## TypeScript Defaults

Treat TypeScript as a design tool.

Defaults:

- prefer `const` functions
- strict typing
- explicit state modelling
- fix the type or the code, not the symptom

Avoid:

- `any` as convenience
- type assertions and non-null assertions (a law; see Type Safety below)
- optional-chaining away modelling problems
- nullish-coalescing away unclear state

Where runtime DI identity is needed, prefer abstract-class tokens with interface-like shape.

## Type Safety (All Stacks)

No `object`, `object?`, `dynamic`, `any`, or `unknown` as value carriers. Model the actual type.

If a value can be string, bool, or number — make a discriminated union, not `object?`.

`Dictionary` / `Record<string, unknown>` only for truly dynamic data — user-provided key-value pairs, JSON blobs from external APIs, config maps with unknown keys. If the keys are known at compile time, use a record or named type instead.

Always prefer stronger typing over flexibility. If a design choice introduces `object?` or untyped dictionaries, that is a signal to model better, not to weaken the type.

**Law:** in TypeScript app code, Vue template expressions included, no type
assertion (`x as T`, `<T>x`) or non-null assertion (`x!`) quiets the compiler.
Fix the type at its source: a typed template ref, `v-model`, a type guard, or a
better model. `as const` and `satisfies` are fine; they check a type rather than
override it.

## C# / .NET Defaults

Apply these when reviewing or writing C# in an existing codebase:

- `sealed` on all concrete types by default
- `record` for DTOs and value objects
- choose EF Core for aggregate persistence and ordinary relational work; choose
  Dapper for deliberate projections or SQL-heavy paths; use raw ADO.NET only
  when the lower-level control itself is required
- `ILogger<T>` directly — no custom logging facades
- when only existence is needed, issue `ExistsAsync` / `AnyAsync` rather than
  hydrating an entity; never use a preceding existence check as the correctness
  mechanism for a later write — use constraints or an atomic conditional write
- Use cases registered as Scoped; caches and config as Singleton

## Furniture Dependencies

A small blessed set of libraries is **furniture** — stable, boring dependencies
whose value outweighs repeatedly rebuilding them. Furniture is permission to use
a proven implementation after its capability is justified, not permission to
introduce the capability without a requirement.

- Zod is TypeScript furniture at untrusted runtime boundaries.
- FluentResults is Application furniture in .NET, not Domain furniture; closed
  domain decisions should use domain-specific outcomes.
- `pg-advisory-lock` is TypeScript/PostgreSQL furniture for justified
  session-level advisory coordination.
- `DistributedLock` is .NET furniture for justified distributed
  synchronisation; use the provider for the system's existing authoritative
  store.
- Brighter is .NET furniture for justified durable messaging, service
  activation, inbox/outbox, and transport. It is not the default in-process
  mediator.

`invariants-and-concurrency.md` owns the admission rules and failure-model
qualifications for concurrency and messaging furniture. The furniture list grows
only by explicit ruling, never by precedent creep.

## Generated Code

Generated code is already an external contract representation, but not
necessarily the capability boundary the application wants.

Do not wrap generated clients/contracts one-for-one unless there is real capability abstraction to add.

Good reasons to add a layer:

- combine multiple generated calls into one capability
- add non-trivial policy/orchestration
- hide a genuinely unstable external boundary

Bad reasons:

- “we always wrap APIs”
- renaming generated methods without adding meaning

Wrap generated code when ownership, semantic translation, volatility, or
testing requires an anti-corruption layer. Do not wrap it merely because it is
generated.

## Composition

Prefer composition at the edge.

That means:

- `app.vue`, layouts, and pages compose frontend capabilities; local component
  collaboration uses props/events
- modules compose backend capabilities
- wiring is explicit
- assembly happens where ownership is clear

Avoid ambient dependency soup.

## Anti-Magic Bias

Prefer explicit registration and orchestration over framework magic.

Be suspicious of:

- auto-scanning
- hidden container behaviour
- reflection-heavy conventions
- smart wrappers that hide where work really happens

## Review Discipline

When reviewing a diff or change:

1. **Enum/value completeness tracing.** When adding a new enum value, status, or type constant — trace every consumer (switch/case, filter arrays, display logic, serialisation). Verify the new value is handled everywhere. Pure diff review is not enough — read outside the diff.

2. **Two-pass priority.** Data safety and race conditions first (TOCTOU, check-then-write without atomic WHERE, find-or-create without unique index). Style and consistency second. Do not interleave severities.

3. **Fix-first heuristic.** When the review is also asked to fix: mechanical fixes (dead code, stale comments, missing includes, unused variables) are just fixed, without asking. In a read-only review, list them as mechanical. Ambiguous fixes (security, design decisions, removing functionality, >20 lines) are batched into one question with recommendations.

4. **A documented gap is a finding.** A known gap excused in a doc, `Accepts`, changelog or comment is a `fix`, as if the doc did not exist (see Root Cause). Never resolve a finding by documenting it: a fix round that only rewords the doc to describe the defect accurately has not fixed it.

5. **Suppress noise.** Do not flag: harmless redundancy that aids readability, threshold values tuned empirically, assertions that could theoretically be tighter but already cover the behaviour.

## Smell Checks

The code is probably drifting if:

- provenance is hard to trace
- generated code is wrapped for sport
- tiny features are buried under heavy ceremony
- real complexity is hidden behind bland names
- the fix is local but the cause is systemic

## Summary

The intended coding style is:

- data transforms over object hierarchies
- principle-first decisions
- explicit seams only where earned
- local-first structure
- root-cause fixes over shims
- strict, honest types — no `unknown`, `object`, or `any` as value carriers
- no self-narrating comments
- obvious provenance
- explicit composition at the edge
- minimal dependencies
