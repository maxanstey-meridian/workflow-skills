## Keep generated Rivet output in a contracts package

**Tooling:** Put generated Rivet output in `packages/contracts`, consumed via its `exports` map — never inside an app directory.

**When:** Frontends calling a Rivet API. Holds `generated/openapi.json`, `generated/schema.d.ts`, and `src/index.ts`, imported as `@<scope>/contracts` or `./client`.

Bad: `apps/ui/app/generated/schema.d.ts`
Good: `packages/contracts/generated/schema.d.ts`
