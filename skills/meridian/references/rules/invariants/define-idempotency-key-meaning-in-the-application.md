## Define idempotency key meaning in the application

**Default:** The application defines what an idempotency key (a token that makes a repeated request safe to run twice) means, including its scope, fingerprint, replay policy, and expiry, and the database or an established library reserves it and arbitrates; an idempotency key is not duplicate-content detection.

**When:** Any operation made idempotent with a key.

Bad: Two requests with the same body treated as one.
Good: A key scoped to the tenant, stored under a unique index, replaying the first response for 24 hours.
