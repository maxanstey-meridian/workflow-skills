## Run Playwright against real wiring

**Law:** Run Playwright against the real frontend, API, and database without `page.route` interception in end-to-end journeys, emitting JUnit XML.

**When:** Implementing or running any `browser` test suite.

Bad: Intercepting API responses with `page.route("**/api/forms", ...)` inside a browser journey test.
Good: Running Playwright against the live frontend, backend API, and database, and emitting JUnit XML for `ledger.mjs results`.
