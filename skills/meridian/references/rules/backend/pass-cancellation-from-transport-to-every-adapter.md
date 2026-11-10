## Pass cancellation from transport to every adapter

**Default:** Cancellation flows from the transport layer through Application to every adapter (implementation of a port) call.

**When:** .NET and TypeScript backends.

Bad: `await http.GetAsync(url)` inside an adapter whose method received a token.
Good: `await http.GetAsync(url, cancellationToken)`.
