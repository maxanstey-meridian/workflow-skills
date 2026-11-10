## Never blindly retry a non-idempotent operation

**Law:** Never blindly retry an operation that is not idempotent (safe to run twice).

**When:** Any retry, in an adapter, a client, a job, or a library's configuration.

Bad: A retry policy wrapped around `POST /payments`.
Good: The same call sent with an idempotency key the provider honours, then retried.
