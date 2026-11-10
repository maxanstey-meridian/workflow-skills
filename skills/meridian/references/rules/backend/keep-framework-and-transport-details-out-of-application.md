## Keep framework and transport details out of Application

**Default:** Application code carries no framework or transport details.

**When:** Application code in a module (one feature's folder under `src/modules/`) on a TypeScript backend.

Bad: a use case that takes the HTTP request object and returns a status code.
Good: a use case that takes a `CreateFormCommand` and returns a `CreateFormResult`, with the route in `interface/http/<feature>-routes.ts` mapping both.
