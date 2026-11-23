## Run against the real host and database

**Law:** Execute `api-contract` tests against the real host and real database (e.g. ASP.NET `WebApplicationFactory` with a PostgreSQL Testcontainer, or a real Hono app with its database), emitting JUnit XML.

**When:** Implementing or running any `api-contract` test suite.

Bad: Mocking the repository or substituting an in-memory database beneath the controller.
Good: Sending HTTP requests through `WebApplicationFactory` backed by a PostgreSQL Testcontainer and writing JUnit XML for `ledger.mjs results`.
