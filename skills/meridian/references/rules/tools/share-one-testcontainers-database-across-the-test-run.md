## Share one Testcontainers database across the test run

**Tooling:** Use Testcontainers to start one PostgreSQL container for the whole run, migrate a template database once, give each test fixture its own copy (`CREATE DATABASE … TEMPLATE …`), and reset data between tests with Respawn.

**When:** .NET integration tests on PostgreSQL.

Bad: a container started and migrated in every fixture's constructor.
Good: one container, one migrated template database, and a copy of the template per fixture.

Links: [Respawn](https://github.com/jbogard/Respawn)
