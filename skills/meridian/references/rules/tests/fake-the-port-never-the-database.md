## Fake the port, never the database

**Law:** A test that avoids persistence fakes the repository or query port (the application-owned type that names the capability); it never puts a fake database underneath the real adapter.

**When:** Backend tests. Either the test runs the real adapter on the real engine, or it fakes the port and the adapter is not under test.

Bad: the real `EfFormRepository` over a fake `DbContext`.
Good: an `InMemoryFormRepository` in place of the port.
