## Run adapter tests on the production database engine

**Law:** Run database adapter integration tests on the production DB engine — never an in-memory or substitute engine.

**When:** Backend tests touching the database. .NET: never call `UseInMemoryDatabase` (EF InMemory checks neither SQL nor relational behaviour); SQLite cannot substitute for PostgreSQL SQL, collation, transactions, or concurrency.

Bad: `options.UseInMemoryDatabase("forms")` in a repository test.
Good: Running the repository against a PostgreSQL container (Testcontainers).
