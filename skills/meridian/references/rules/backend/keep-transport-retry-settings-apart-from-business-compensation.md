## Keep transport retry settings apart from business compensation

**Default:** Transport retry settings stay separate from business compensation.

**When:** Code that retries a failed call, or compensates for a failed step, on a backend.

Bad: a use case that raises the gateway HTTP client's retry count so that a failed charge is retried instead of refunded.
Good: the adapter retries transient HTTP failures by its own retry settings, and the use case decides on a refund as a business step.
