## Prove the invariant even when a library provides the capability

**Default:** When a library provides a capability, still prove the invariant, choose the correct boundary, and understand each provider's failure model.

**When:** Adding a library, framework feature, or SDK for a capability an invariant relies on, such as a lock, an outbox, or a queue.

Bad: A lock library added and the invariant left untested, because "the library handles it".
Good: The same lock, with a test that fails without it and the provider's behaviour on connection loss accounted for.
