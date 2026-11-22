## Never stretch a transaction across an HTTP call

**Law:** Never hold a DB transaction or lock across an HTTP call to fake atomicity; use explicit reconciliation, or a durable workflow with idempotent external steps when retries or compensation are needed.

**When:** Any use case that writes to the database and calls an external API.

Bad: `BEGIN; insert order; await payments.charge(); COMMIT`.
Good: Saving the order pending, charging with an idempotency key, and settling via reconciliation.
