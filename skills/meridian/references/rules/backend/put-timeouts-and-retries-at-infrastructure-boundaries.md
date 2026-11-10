## Put timeouts and retries at Infrastructure boundaries

**Default:** Timeouts, retries, and circuit breaking live in the adapter (the implementation of a port) at a volatile boundary.

**When:** Adapters that call something that can fail or stall.

Bad: A `for` retry loop inside a use case around `gateway.Charge`.
Good: Retry settings on the gateway adapter's HTTP client, with the use case calling `gateway.Charge` once.
