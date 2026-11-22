## Test an adapter directly only when it has behaviour

**Default:** Test an adapter directly when it is non-trivial, its mapping or failure handling matters, or the external API is brittle; never write tests that only restate the ORM or SDK.

**When:** Deciding whether an adapter needs its own tests.

Bad: Saving and loading an entity through a one-line EF repository.
Good: Testing an adapter that maps a unique-violation to "already exists".
