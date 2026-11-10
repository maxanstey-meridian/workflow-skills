## Use Brighter for durable messaging in dotnet

**Tooling:** When the application really needs durable messaging, service activation, an inbox or outbox, or a transport, use Brighter; it is not an in-process mediator.

**When:** .NET backends.

Bad: a hand-written outbox table and poller.
Good: Brighter's outbox.

Links: [Brighter](https://github.com/BrighterCommand/Brighter)
