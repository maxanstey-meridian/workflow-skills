## Reuse shared E2E helpers

**Law:** Keep `<case>/{setup,scenarios,actions}.ts` strictly to page-specific fixtures and locators; never copy-paste HTTP/CSRF wrappers, `responseWhile`/request spies, OpenAPI `parseResponse` or `typed-json` guards, cleanup fixtures, date formatters, auth/org registration, or disposable-DB helpers between cases, promote any helper needed by a second case into a shared E2E helper module with direct imports (no re-export shims), and prefer the repo's OpenAPI-backed `parseResponse` helper (when present) over hand-rolled `parse*` guards or inline `z.object(...)` DTO schemas.

**When:** Designing `/spec` pieces or implementing helpers and specs for any `browser` oracle case.

Bad: Copy-pasting `apiFetch`, `responseWhile`, `parseFormDto`, or auth/org registration into `e2e/oracle/<case>/setup.ts`, or leaving a re-export shim in an earlier case folder.
Good: Importing `responseWhile`, `parseResponse`, and auth/cleanup fixtures directly from shared E2E helper modules, promoting any helper needed by a second case in a first piece, and keeping `e2e/oracle/<case>/{setup,scenarios,actions}.ts` strictly to page-specific fixtures and locators.
