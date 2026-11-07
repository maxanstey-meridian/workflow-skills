## Laws

Each line is a summary; the file in brackets (a rule file, or a design document
and the heading in it) states it in full. The backend and frontend Laws files
beside this one hold the Laws for one stack.

- a gap with a doc page is still a gap: a known defect, an unchecked promise or
  a path that only works "because nothing does X today" gets fixed, not written
  up; refusing valid input is not a fix; `Accepts` holds deliberate trade-offs
  only [`coding/root-cause.md`]
- model the invariant before choosing enforcement or concurrency; the domain,
  not a caller, decides what the invariant is
  [`invariants/invariant-enforcement.md`]
- callers never re-derive a server rule: a UI reads the read model's
  `availableActions`, capabilities or named flag; a second use case calls the
  same decision [`frontend/server-rules-stay-on-the-server.md`]
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
