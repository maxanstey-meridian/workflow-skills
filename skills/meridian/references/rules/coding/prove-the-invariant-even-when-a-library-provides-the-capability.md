## Prove the invariant even when a library provides the capability

**Default:** Even when a library provides a capability, still prove the invariant, pick the right boundary, and account for the provider's failure model.

**When:** Adopting a library, framework feature, or SDK for an invariant-bearing capability (lock, outbox, queue).

Bad: Adding a lock library and skipping the test because "the library handles it".
Good: The same lock with a test that fails without it and handling for connection loss.
