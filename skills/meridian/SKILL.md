---
name: meridian
description: Meridian house doctrine for backend/frontend architecture, domain invariants, concurrency, outcome-oriented UI and user journeys, testing, coding decisions, and tool defaults. Use when designing or reviewing invariant enforcement, transactions, races, locks, queues, outboxes, interfaces, forms, setup flows, module boundaries, ports and adapters, page composition roots, testing strategy, TypeScript defaults, generated-code boundaries, or repo tool choices.
---

# Meridian

Use this skill for Meridian-style engineering doctrine across backend, frontend, testing, and tooling.

## When to Use This Skill

- designing a new backend or frontend app
- reviewing whether a UI explains user outcomes rather than implementation details
- ordering forms, setup flows, and configuration screens around the user journey
- simplifying technical configuration into understandable user decisions
- reviewing whether an abstraction or seam is earned
- deciding where an invariant belongs or whether a race requires coordination
- checking ports-and-adapters / VSA boundaries
- deciding page composition root vs component/composable ownership
- choosing testing strategy
- deciding whether generated code should be wrapped
- checking whether a repo matches Meridian tool defaults

## How to Use It

Read only the reference files needed for the task:

- backend structure, module boundaries, ports/adapters:
  - `references/backend-pa-vsa.md`
- frontend structure, page composition roots, provide/inject, dumb views:
  - `references/frontend-pa-vsa.md`
- outcome-oriented UI, information hierarchy, form journeys, progressive disclosure,
  and accessibility, formatting, or validation details the spec leaves open:
  - `references/frontend-ui.md`
- testing defaults and mock/fake bias:
  - `references/testing-philosophy.md`
- invariant ownership, recording invariants (INVARIANTS.md), domain-model enforcement, concurrency, transactions,
  locks, queues, outboxes, and when scheduled work runs:
  - `references/invariants-and-concurrency.md`
- cross-cutting coding doctrine, TypeScript defaults, seam discipline:
  - `references/coding-philosophy.md`
- tool choices and config defaults for TS and .NET:
  - `references/tools.md`
- Rivet backend doctrine for `.NET` contracts, minimal APIs, controllers, and transport-edge patterns:
  - `references/rivet.md`

## Core Rules

Rule strength follows `references/coding-philosophy.md`: a law protects
correctness, ownership, or dependency direction, and breaking one is a bug; a
default is the greenfield choice with explicit exceptions; a preference is
house consistency; a tooling rule is a current, replaceable implementation
choice.
Each rule below is a one-line summary; its reference file is the authority.

### Laws

Each line is a summary; the section named in brackets states the rule in full.

- a gap with a doc page is still a gap: a known defect, an unchecked promise or
  a path that only works "because nothing does X today" gets fixed, not written
  up; refusing valid input is not a fix; `Accepts` holds deliberate trade-offs
  only [Root Cause]
- model the invariant before choosing enforcement or concurrency; the domain,
  not a caller, decides what the invariant is [Invariant Enforcement]
- declared failures are results; undeclared failures are exceptions
  [Coding Style Rules]
- callers never re-derive a server rule: a UI reads the read model's
  `availableActions`, capabilities or named flag; a second use case calls the
  same decision [Logic]
- modules integrate through consumer-owned required ports, provider-owned
  published contracts, or a deliberately shared kernel; Domain never consumes
  a sibling's published contract [Non-Negotiable Dependency Rules]
- the API is not the information architecture: UI language and ordering follow
  the user's journey and desired outcomes, not transport models, backend
  operations, configuration variants, or implementation sequence [Core Law]
- provide implementations, not projections: a page that needs more of a
  capability widens its port; it doesn't unpack it, repack it, or add getters
  to hand out pieces [Adapters]
- frontend composition happens only in Nuxt shells: `app.vue`, layouts, and
  pages provide capabilities/contexts with `provideX`; components and
  composables only inject them with `injectX`
  [Nuxt Shells As Composition Roots]
- adapter integration tests run on the production database engine — EF
  InMemory is banned (a fake engine manufactures confidence); fake the port
  when the adapter is not under test [Test Substrate]
- do not hand-roll commodity infrastructure, protocols, or dev tooling when a
  suitable maintained framework, library, official SDK, or generated client
  exists; custom machinery carries the same burden of proof as a new dependency
  [Use Libraries Before Building Machinery]
- in TypeScript app code, Vue template expressions included, no type assertions
  or non-null assertions [Type Safety (All Stacks)]
- no check-then-write as the final correctness mechanism, no coordination
  machinery for a race that is merely conceivable, no hand-rolled locks or
  outboxes, no blind retries, and no outbox unless atomic state-plus-message
  publication is the invariant [Laws]

A Law beats any spec or plan Decision: when a design and a Law conflict, the
design changes, and a Decision that breaks one is a defect, not a choice.

### Defaults

Each line is a summary of a rule in its own section.

- prefer explicit, honest boundaries
- ask users for decisions they understand; progressively disclose the mechanism
  needed to express each decision
- make defaults, consequences, and the resulting outcome visible
- accessibility, formatting, display, or validation the spec leaves open follows
  the GOV.UK Design System and style guide, unless the repo's UI skill decides it
- seams must be earned
- keep things local and preserve ownership when they gain more consumers
- use the narrowest owner and smallest mechanism that make an invariant true
- scheduled work runs off-peak and spread out: outside working hours, or before
  the day starts when a person sees its result, each tenant or subject offset by
  a stable hash of its id
- a lifecycle with several guarded actions gets one pure decider
  (`Refusal` / `Available`) that guards the use cases and feeds
  `availableActions`; the decider explains, the database enforces
- generated code is an external contract representation; add an
  anti-corruption layer only when it adds semantic value
- tests default to real behaviour over mock soup and mechanically enforce
  modular boundaries
- FluentResults is Application furniture, not Domain furniture
- strategic DDD helps discover boundaries; tactical DDD is conditional
- frontends are SPAs (`ssr: false` assumed)

### Preferences

- tooling stays boring and explicit
- no type-tag suffixes in TS file names (`.port.ts`, `.service.ts`,
  `.use-case.ts`); dirs carry the role; `<feature>.module.ts` exempt

## Mechanical Checking

[Plumb](https://github.com/maxanstey-meridian/plumb) checks a repo against this
doctrine. Run it only when the repo's instructions name Plumb or the repo
defines a Plumb task or script; otherwise skip it, and don't report it as
unavailable. When it applies, run it after completing changes and fix all
error-level findings:

- if the repo defines a Plumb task or script (for example `task plumb`), run
  that: it applies the repo's own baseline and options;
- otherwise run it the way the repo's instructions say, or from a local
  checkout: `<plumb-checkout>/plumb . --json`.

If the repo uses Plumb but it won't run, say so in your report rather than
skipping the check silently. Setup is in its README.

Each finding's `docRef` (a file name, `#`, and a heading slug) names the heading
it enforces; read the rule section with that heading before fixing. Fix `error`
findings unprompted. For `warn` findings, fix them or state the exception that
applies. Do not re-run Plumb in a loop on a repo you have not changed.

Plumb's findings are the floor, not the review. A clean Plumb run is not a
review.

## Notes

- For backend/frontend structure, do not restate generic clean architecture from scratch; use the Meridian references directly.
- For testing and coding questions, prefer the doctrine here over generic framework advice.
- AGENTS.md is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.
- The routines carry generated copies of these rules, section by section. After editing this file's Laws, Defaults, Preferences, or Mechanical Checking, or a reference, run `sh scripts/build-doctrine.sh`, then `sh tests/doctrine.sh`, in the workflow-skills repo. A new heading also needs a line in `scripts/doctrine-manifest.txt`.
