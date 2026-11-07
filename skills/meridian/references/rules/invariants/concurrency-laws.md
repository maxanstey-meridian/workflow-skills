## Concurrency Laws

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
