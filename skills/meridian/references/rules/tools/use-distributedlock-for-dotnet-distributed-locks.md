## Use DistributedLock for dotnet distributed locks

**Tooling:** When distributed synchronisation is needed, use `DistributedLock` with the provider package for the system's existing authoritative store, and account for that provider's handle-loss and abandonment behaviour.

**When:** .NET backends.

Bad: a Redis lock provider added to a system whose only store is PostgreSQL.
Good: the PostgreSQL provider.

Links: [DistributedLock](https://github.com/madelson/DistributedLock)
