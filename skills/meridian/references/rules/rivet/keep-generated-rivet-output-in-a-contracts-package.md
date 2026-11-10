## Keep generated Rivet output in a contracts package

**Tooling:** Generated Rivet output lives in a workspace package, `packages/contracts`, consumed through its `exports` map, never in a directory inside an app.

**When:** Frontends that call a Rivet API (Rivet reads C# and emits the OpenAPI document). The package holds `generated/openapi.json` (OpenAPI 3.1 from the contract), `generated/schema.d.ts` (`openapi-typescript` output), and `src/index.ts` (the client facade); it is imported as `@<scope>/contracts` or a `./client` subpath.

Bad: `apps/ui/app/generated/schema.d.ts`
Good: `packages/contracts/generated/schema.d.ts`
