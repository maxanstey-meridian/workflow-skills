## Run adapter tests on the production database engine

**Law:** Integration tests of a database adapter run on the production database engine; an in-memory or substitute engine is never used.

**When:** Backend tests whose subject touches the database. .NET: `UseInMemoryDatabase` appears nowhere in test source, since the EF InMemory provider checks neither SQL nor relational behaviour; SQLite does not stand in for PostgreSQL-specific SQL, collation, transactions, or concurrency.

Bad: `options.UseInMemoryDatabase("forms")` in a repository test.
Good: the repository run against a PostgreSQL container (Testcontainers).
