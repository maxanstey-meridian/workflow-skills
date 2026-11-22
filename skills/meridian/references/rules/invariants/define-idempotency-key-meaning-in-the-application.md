## Define idempotency key meaning in the application

**Default:** Define an idempotency key's scope, fingerprint, replay policy, and expiry in the application, while the database or an established library reserves and arbitrates it; it is not duplicate-content detection.

**When:** Any operation made idempotent with a key.

Bad: Treating two requests with the same body as one.
Good: A tenant-scoped key under a unique index replaying the first response for 24 hours.
