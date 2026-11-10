## Test an adapter directly only when it has behaviour

**Default:** Test an adapter (the implementation of a port against a database, client, or SDK) directly when it is non-trivial, its mapping matters, its failure handling matters, or the external system's API is brittle; do not write tests that only restate what the ORM or SDK does.

**When:** Deciding whether an adapter needs its own tests.

Bad: a test that saves an entity and loads it back through a one-line EF repository.
Good: a test of the adapter that maps a unique-violation to "already exists".
