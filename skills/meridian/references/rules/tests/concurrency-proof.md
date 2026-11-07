## Concurrency Proof

`invariants/concurrency-review.md` owns concurrency admission and escalation. Tests
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
