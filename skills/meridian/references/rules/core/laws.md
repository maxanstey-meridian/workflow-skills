## Laws

Each line is a summary; the rule file in brackets states it in full.

- a gap with a doc page is still a gap: a known defect, an unchecked promise or
  a path that only works "because nothing does X today" gets fixed, not written
  up; refusing valid input is not a fix; `Accepts` holds deliberate trade-offs
  only [`coding/root-cause.md`]
- model the invariant before choosing enforcement or concurrency; the domain,
  not a caller, decides what the invariant is
  [`invariants/invariant-enforcement.md`]
- declared failures are results; undeclared failures are exceptions
  [`backend/results-vs-exceptions.md`]
- callers never re-derive a server rule: a UI reads the read model's
  `availableActions`, capabilities or named flag; a second use case calls the
  same decision [`frontend/server-rules-stay-on-the-server.md`]
- modules integrate through consumer-owned required ports, provider-owned
  published contracts, or a deliberately shared kernel; Domain never consumes
  a sibling's published contract [`backend/dependency-rules.md`]
- the API is not the information architecture: UI language and ordering follow
  the user's journey and desired outcomes, not transport models, backend
  operations, configuration variants, or implementation sequence
  [`ui/core-law.md`]
- provide implementations, not projections: a page that needs more of a
  capability widens its port; it doesn't unpack it, repack it, or add getters
  to hand out pieces [`frontend/provide-implementations-not-projections.md`]
- frontend composition happens only in Nuxt shells: `app.vue`, layouts, and
  pages provide capabilities/contexts with `provideX`; components and
  composables only inject them with `injectX`
  [`frontend/nuxt-shells-as-composition-roots.md`]
- adapter integration tests run on the production database engine — EF
  InMemory is banned (a fake engine manufactures confidence); fake the port
  when the adapter is not under test [`tests/test-substrate.md`]
- do not hand-roll commodity infrastructure, protocols, or dev tooling when a
  suitable maintained framework, library, official SDK, or generated client
  exists; custom machinery carries the same burden of proof as a new dependency
  [`coding/use-libraries-before-building-machinery.md`]
- in TypeScript app code, Vue template expressions included, no type assertions
  or non-null assertions [`coding/type-safety-all-stacks.md`]
- no check-then-write as the final correctness mechanism, no coordination
  machinery for a race that is merely conceivable, no hand-rolled locks or
  outboxes, no blind retries, and no outbox unless atomic state-plus-message
  publication is the invariant [`invariants/concurrency-laws.md`]

A Law beats any spec or plan Decision: when a design and a Law conflict, the
design changes, and a Decision that breaks one is a defect, not a choice.
