## Invariant Enforcement

The governing sequence is:

1. State the invariant independently of implementation.
2. Put enforcement at the narrowest owner with enough information.
3. Consider concurrency only when a concrete interleaving can violate it.
4. Use the smallest established mechanism that keeps it true.
5. Prove the interleaving at the real arbitration boundary.

Do not let concurrency machinery become a substitute for modelling the rule.

**Law:** important product invariants are established by the domain and encoded
at an authoritative enforcement boundary. An LLM, controller, UI, prompt,
comment, or test suite is not the authority that decides what the invariant is.

Use the narrowest owner with enough information to enforce the invariant. An
abstraction earns its place when it shrinks the representable state space,
centralises a legal transition, or owns a real consistency boundary.

Choose by the kind of invalid state:

### Representation or local value

Prefer the smallest sufficient boundary:

1. a precise static type or discriminated union
2. runtime schema validation at an untrusted boundary
3. a parser or value object when raw construction must be prevented

Do not wrap every scalar. A parser or value object earns its place when it makes
invalid construction impossible or removes duplicated validation.

### Local business decision

Prefer:

1. a pure domain function for a decision over supplied state
2. a behavioural entity when methods must protect one lifecycle
3. an aggregate only when several facts form one atomic consistency boundary

Several fields participating in validation do not by themselves justify an
aggregate. Plain data and pure functions remain the default.

A lifecycle with several guarded actions gets one pure decider: `invariants/deciders.md`.

### Persisted relational state

Prefer:

1. database constraints for declarative truths
2. one atomic conditional SQL operation for state-dependent writes
3. optimistic concurrency when writers must detect stale state
4. a short transaction when one invariant requires several writes atomically

Application checks may improve errors, but the final authority remains the
constraint, conditional write, concurrency token, or transaction.

### Cross-process state

Cross this boundary only when the invariant actually does:

- use an established durable queue when the domain can assign serial ownership
  of work to a partition or consumer
- use an established transactional outbox when a committed database change must
  reliably produce a message
- use a durable workflow when the invariant spans non-transactional external
  systems and requires retries, compensation, or reconciliation

A queue changes ownership and processing topology. An outbox solves atomic
state-plus-message publication. Neither is a generic higher rung of database
concurrency control.
