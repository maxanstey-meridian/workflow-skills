# Invariants And Concurrency

## Purpose

Use this when deciding where a domain rule belongs, whether a domain model has
earned its place, or whether a race requires coordination infrastructure.

The governing sequence is:

1. State the invariant independently of implementation.
2. Put enforcement at the narrowest owner with enough information.
3. Consider concurrency only when a concrete interleaving can violate it.
4. Use the smallest established mechanism that keeps it true.
5. Prove the interleaving at the real arbitration boundary.

Do not let concurrency machinery become a substitute for modelling the rule.

## Invariant Enforcement

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

#### Deciders

**Default:** give an entity one decider, a pure module that answers "may this
action happen now, and if not, why?", when all four hold:

1. its lifecycle is a small closed set of states (an enum, or a few flags and
   dates that combine into one);
2. several user actions depend on that state;
3. the answer is needed in several use cases and on the page;
4. the decision is pure: facts that need I/O (in use, ready, anything left) are
   loaded first and passed in.

Fit is structural. A live bug, or a page that disagrees with the server, shows
where a decider would have helped; it is not evidence that one fits.

```csharp
public enum RecordAction { Amend, Extend, Suspend, Reinstate, Revoke, Surrender }
public enum RecordRefusal { Anonymised, Lapsed, Ended, AlreadyThere }

public static class RecordLifecycle
{
    public static RecordRefusal? Refusal(RecordState record, RecordAction action, DateOnly today);

    public static IReadOnlyList<RecordAction> Available(RecordState record, DateOnly today) =>
        Enum.GetValues<RecordAction>().Where(a => Refusal(record, a, today) is null).ToList();
}
```

- Inputs are plain state and the time, passed in. No I/O, no clock, no
  repositories, no services. A date-based rule takes the business date ("today"
  in the organisation's time zone) from the one clock every caller uses, not a
  UTC date cut from `now`.
- The refusal is a closed domain value, not an exception. The use case maps it
  once to the declared failure (`backend-pa-vsa.md`, Results vs exceptions).
- Every use case for those actions guards with `Refusal`. The read side projects
  `Available` as `availableActions` on the entity's detail read model, so no
  caller re-derives the rule.
- Formalise the decision only. The state change stays a plain transform (`with`,
  spread) in the use case unless the transform is itself a rule.
- **The decider explains; the database enforces.** It sits in front of, and never
  replaces, the constraint, conditional write, concurrency token or transaction
  that arbitrates races (Persisted relational state below). A rule SQL must also
  express, such as a list filter by derived status, keeps its SQL copy, held to
  the decider by a test.

A policy is any pure decision. A decider is the policy that guards one
lifecycle's actions and lists which are open. Use a plain policy function when
there is one decision with one or two callers and no action list to show.

When a criterion fails, use the smaller tool:

- one action, guarded in one place: an inline guard, plus a flag if the page
  needs it;
- users need one yes/no about the entity, not an action list: project a flag on
  the read model;
- the system, not a user, drives the transitions (deliveries, deadlines,
  retries): conditional writes and constraints own them;
- an external system owns the lifecycle: mirror its states as a closed type;
- the database already expresses the whole rule: leave it there.

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

## Concurrency Review

**Default:** do not add infrastructure merely because a race is theoretically
possible. First state the invariant and show a concrete interleaving that would
violate it.

For a demonstrated race, prefer in order:

1. explicitly accept last-writer-wins when it violates no invariant
2. database constraints
3. one atomic conditional SQL statement such as `INSERT ... ON CONFLICT` or
   `UPDATE ... WHERE ... RETURNING`
4. optimistic concurrency through a version or concurrency token
5. a short database transaction at the appropriate isolation level
6. row-level locking when one decision genuinely spans existing rows
7. an established advisory or distributed-lock library when no database row,
   constraint, or atomic operation can represent the coordination target

Do not use a preceding existence check as the correctness mechanism for a later
write. `Exists` followed by insert or update is still a race; let the write's
constraint or predicate arbitrate it.

An advisory lock is not the default implementation of idempotency or duplicate
suppression. Use one only when the lock target is a real domain identity that the
earlier rungs cannot represent. Lock names, scope, timeout, cancellation,
connection loss, and release semantics are part of the design.

The application owns the meaning of an idempotency key, its scope, fingerprint,
replay policy, and expiry. The database or established library owns reservation,
concurrency arbitration, and atomic persistence. Idempotency is not content
duplicate suppression.

## Scheduled Work

**Default:** scheduled work runs off-peak and spread out.

- Pick a job's time from when its users work, not a round number. Batch work
  (sweeps, reconciliation, rebuilds) runs outside working hours. Work whose
  result a person sees, such as an email, runs before their day starts, not at
  its start, when staff are signing in and the system is busiest.
- Never start every tenant's or subject's job at the same instant. Offset each
  one by a stable hash of its id across a window, so the load spreads and a
  rerun keeps the same slot.
- A job's time is a named constant, in the zone its users live in, with a
  comment saying why it runs then.

## Proof Requirement

Before adding concurrency machinery:

1. State the invariant independently of implementation.
2. Show a concrete read/write interleaving that violates it.
3. Explain why last-writer-wins is unacceptable.
4. Identify the authoritative arbitration boundary.
5. Explain why every earlier applicable rung is insufficient.
6. Test the interleaving against the production persistence or runtime substrate.

More than approximately 30 lines of custom coordination machinery requires an
explicit explanation of why constraints, atomic SQL, optimistic concurrency, and
a short transaction cannot satisfy the invariant. This is a review trigger, not
a design metric. Ordinary SQL, adapter wiring, and tests do not count; custom
lock, lease, retry, heartbeat, fencing, or coordination state does.

Concurrency tests should coordinate actors deterministically with barriers,
hooks, or controlled transactions rather than timing sleeps. Assert the durable
winner and loser outcomes, not merely that a lock API was called.

## Recording Invariants

**Default:** a module records the invariants it owns in an `INVARIANTS.md` at the
module root, beside the code a change would break. Colocation is the point: whoever
edits the module meets its rules without needing to know where to look.

An invariant earns an entry only when a capable newcomer could break it with a
reasonable-looking change. A rule already made unrepresentable by a type, or
arbitrated by a database constraint, needs no entry. The constraint already speaks
for itself.

Each entry has a stable ID, unique across the repository and never renumbered once
code or docs cite it (for example `FORM-RULES-001`), and a present-tense title,
as its heading, then its fields:

```markdown
## FORM-RULES-001: A published form never changes
**Rule:** what must hold, in one paragraph.
**Why:** the harm it prevents; the alternative rejected, if one was weighed.
**Accepts:** the known cost of the rule, if any.
**Owner:** `PublishFormUseCase`
**Proof:** `PublishFormTests`
```

- Write the rule as it holds now. When it changes, edit the entry; history lives
  in version control. The file is not a decision log.
- `Accepts` is what stops a later change from "fixing" a deliberate cost. Omit it
  when the rule has none. It holds trade-offs chosen over a working alternative,
  never known defects or unchecked promises: a gap with a doc page is still a
  gap (`coding-philosophy.md`, Root Cause).
- `Owner` names the authoritative boundary from Invariant Enforcement, not every
  caller on the path.
- Before writing `Owner` or `Proof`, open both and confirm the proof would fail if
  the owner stopped enforcing the rule. A claim the code does not back is worse
  than no entry.
- No status, author, date, or tag fields, and no minimum number of alternatives or
  consequences. A rule is either enforced and proved, or it is not an invariant
  yet.
- A rule that spans modules is recorded by each owner that enforces part of it,
  each entry naming its own boundary and pointing at the others.

A decision with no single owning module, such as deployment topology, contract
generation, or a release policy, does not belong in any `INVARIANTS.md`. If such a
decision keeps being relitigated, record it once in `docs/decisions/` with
Context, Decision, Accepts, and Rejected alternatives.

**Tooling:** Plumb's MER-CP-002 checks every INVARIANTS.md outside
`node_modules`, fenced code aside. An ID is upper-case words joined by hyphens,
then a hyphen and three digits (`FORM-RULES-001`). It reads a rule from every
level-2 heading that starts with an ID: write `## FORM-RULES-001: Title`, though
a dash or a space after the ID also heads a rule. An ID-shaped word
with SHA, AES, RFC, ISO, MER, D, ADR, or HTTP before its number (`SHA-256`,
`HMAC-SHA-256`, `D-012`, `HTTP-409`) is prose, not a rule ID, unless a rule
defines it; a level-2 heading whose ID starts with one of those words is an
ordinary heading (`## SHA-256 Hashes`) unless a colon follows the ID, so `## ISO-001: Title`
still defines a rule. It reads the backticked names after an `**Owner:**` or
`**Proof:**` label at the start of a line. It fails on a rule with no Owner,
Proof, or title, an ID defined twice, any other ID-shaped word in an
INVARIANTS.md that no rule defines, a heading at another level that starts with
such an ID, a `## ID: Title` heading whose number isn't three digits
(`## FORM-RULES-01: Title`), a file that defines no rule, a cited name the code
no longer has, and a path, or a file name with an extension Plumb lists
(`.cs`, `.ts`, `.json`, `.yml`, and so on), that matches several files. In a
Proof, a lower-case name with no `/` and no lower-case dotted ending
(`current_timestamp`, `now()`) describes what the test checks, so it isn't
checked; paths, names with a lower-case dotted ending (`smoke.ps1`,
`area.status`), and `…Tests` names are. A name not in backticks isn't checked.

## Laws

- Never use check-then-write as the final correctness mechanism.
- Never add coordination infrastructure because a race is merely conceivable.
- Never hand-roll distributed locks, leases, heartbeats, fencing, outboxes,
  inboxes, retry schedulers, or durable queues unless explicitly required and no
  maintained framework or library satisfies the invariant.
- Never claim atomicity across a database and an HTTP API by extending a local
  transaction or holding a lock longer.
- Never use an outbox unless atomic state-plus-message publication is the actual
  invariant.
- Never retry a non-idempotent operation blindly.
- Never use an aggregate merely because several fields participate in validation.
- Never copy a domain decision into a caller. A second use case calls the
  decision; a UI reads its projection (a flag or `availableActions`).

If supposedly separate modules repeatedly require atomic changes to both models,
revisit the module boundary before adding coordination machinery.

## Established Furniture

Furniture is available only after the preceding ladder justifies its category:

- TypeScript with PostgreSQL session-level advisory coordination:
  [`pg-advisory-lock`](https://github.com/IlyaSemenov/pg-advisory-lock). It does
  not provide fencing or exactly-once execution; connection loss can release the
  lock while the callback continues. It requires a direct connection or
  session-pooled PgBouncer, not transaction or statement pooling.
- .NET distributed synchronisation:
  [`DistributedLock`](https://github.com/madelson/DistributedLock), selecting
  the provider package for the existing authoritative store and accounting for
  that provider's handle-loss and abandonment semantics.
- .NET durable messaging, service activation, inbox/outbox, and transport:
  [Brighter](https://github.com/BrighterCommand/Brighter), when the application
  genuinely needs those capabilities. It is not the default in-process mediator.

Where applicable, these libraries remove the justification for a private version
of the capability they provide. They do not remove the need to prove the
invariant, choose the correct boundary, or understand each provider's failure
model.
