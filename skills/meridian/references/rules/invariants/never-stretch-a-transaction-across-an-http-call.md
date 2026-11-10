## Never stretch a transaction across an HTTP call

**Law:** Never claim that a database change and an HTTP call are atomic by holding a transaction or a lock open across the call; accept explicit reconciliation, or, when the invariant needs retries, compensation, or reconciliation across systems that share no transaction, use a durable workflow with idempotent external steps.

**When:** A use case that writes to the database and calls an external API.

Bad: `BEGIN; insert order; await payments.charge(); COMMIT`.
Good: The order saved as pending, the charge made with an idempotency key, and a reconciliation step that settles the order.
