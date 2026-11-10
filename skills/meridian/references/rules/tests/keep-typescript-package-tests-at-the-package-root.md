## Keep TypeScript package tests at the package root

**Preference:** Use a top-level `test/` or `tests/` directory at the package root for a TypeScript API's or library's tests.

**When:** TypeScript APIs and libraries.

Bad: `src/modules/quotes/list-quotes.test.ts`
Good: `test/modules/quotes/list-quotes.test.ts`
