## Share one Testcontainers database across the test run

**Tooling:** Start one PostgreSQL Testcontainer per test run, migrate a template DB once, clone per fixture (`CREATE DATABASE … TEMPLATE …`), and reset between tests with Respawn.

**When:** .NET integration tests on PostgreSQL.

Bad: Starting and migrating a container in every fixture's constructor.
Good: One container, one migrated template DB, and a template clone per fixture.

Links: [Respawn](https://github.com/jbogard/Respawn)
