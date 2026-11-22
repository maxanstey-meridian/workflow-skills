## Fake the port, never the database

**Law:** To avoid persistence in a test, fake the repository or query port — never put a fake database beneath the real adapter.

**When:** Backend tests: either run the real adapter on the real engine, or fake the port.

Bad: Running `EfFormRepository` over a fake `DbContext`.
Good: Substituting `InMemoryFormRepository` for the port.
