## Run Playwright against real wiring

**Law:** Run Playwright against the real frontend, API, and database without `page.route` interception in end-to-end journeys, emitting JUnit XML through a dedicated oracle Playwright config (`playwright.oracle.config.*`, reused if one already exists) rather than altering the repo's base `playwright.config.*`, and placing specs under a case-scoped folder (`e2e/oracle/<case>/`).

**When:** Implementing or running any `browser` test suite.

Bad: Intercepting API responses with `page.route("**/api/forms", ...)` inside a browser journey test, editing `playwright.config.ts` when `playwright.oracle.config.ts` already exists, or placing specs directly in a flat `e2e/oracle/` folder that collides with the next page's case.
Good: Running Playwright via `playwright.oracle.config.ts` against the live frontend, backend API, and database, with specs under `e2e/oracle/<case>/` and JUnit XML passed to `ledger.mjs results`.
