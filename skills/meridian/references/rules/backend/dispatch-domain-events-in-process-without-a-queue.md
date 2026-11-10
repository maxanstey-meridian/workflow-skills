## Dispatch domain events in process without a queue

**Default:** A domain event is an in-memory fact produced by a domain decision; collect and dispatch it explicitly in process, and add durable messaging only when the required consistency crosses the process boundary.

**When:** .NET and TypeScript backends.

Bad: `FormPublished` sent through a message broker to a handler in the same process.
Good: The use case collecting the event and calling the handler directly.
