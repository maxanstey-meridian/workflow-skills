## Leave commodity mechanics to the library

**Law:** When you adopt a library, leave commodity protocol and runtime mechanics to it and keep the application's product rules, ports (the application-owned types that name a capability), idempotency semantics, transaction boundaries, failure interpretation, and orchestration in the application; do not fork an SDK's job into application code.

**When:** Writing application code around a library, framework feature, or SDK that already does the job.

Bad: A `PaymentGateway` class that re-implements the SDK's request signing, with the SDK left unused.
Good: The SDK signs and sends; the application decides what a failed charge means and when to retry.
