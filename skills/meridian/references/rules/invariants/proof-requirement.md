## Proof Requirement

Concurrency machinery is custom lock, lease, retry, heartbeat, fencing, or
coordination state, at any size; ordinary SQL, adapter wiring, and tests are not.
Before adding any:

1. State the invariant independently of implementation.
2. Show a concrete read/write interleaving that violates it.
3. Explain why last-writer-wins is unacceptable.
4. Identify the authoritative arbitration boundary.
5. Explain why every earlier applicable rung of the `invariants/concurrency-review.md` ladder is insufficient.
6. Test the interleaving against the production persistence or runtime substrate.

Concurrency tests should coordinate actors deterministically with barriers,
hooks, or controlled transactions rather than timing sleeps. Assert the durable
winner and loser outcomes, not merely that a lock API was called.
