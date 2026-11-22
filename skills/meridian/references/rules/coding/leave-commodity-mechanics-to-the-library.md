## Leave commodity mechanics to the library

**Law:** Leave commodity protocol and runtime mechanics to the adopted library while keeping product rules, ports, idempotency, transaction boundaries, failure interpretation, and orchestration in the application; never fork an SDK's job into app code.

**When:** Writing application code around a library, framework feature, or SDK that already handles the mechanics.

Bad: A `PaymentGateway` re-implementing the SDK's request signing while leaving the SDK unused.
Good: The SDK signs and sends; the application decides what a failed charge means and when to retry.
