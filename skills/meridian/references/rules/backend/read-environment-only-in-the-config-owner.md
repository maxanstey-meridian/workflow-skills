## Read environment only in the config owner

**Default:** Production source reads the environment only in the root configuration or bootstrap files, and everything else takes the validated config object by injection.

**When:** TypeScript server code. Owners are `config.ts`, `config.mts`, `config.cts`, `config/**`, `bootstrap.ts`, `bootstrap.mts`, `bootstrap.cts`, or `bootstrap/**` at a package root, optionally under `src/`; each package with its own `package.json` has its own, and a folder of that name inside a module is not an owner. Outside them: no `process.env`, `globalThis.process.env`, `Bun.env`, `Deno.env`, or `env` imported from `process` or `node:process`. Build-tool config (`*.config.{ts,mts,cts}` at a package root, such as `vite.config.ts`) is not production source. A new variable is added to the schema in the owner (Zod, in `src/config.ts` or equivalent).

Bad: `const url = process.env.DATABASE_URL` in a repository.
Good: `constructor(private readonly config: Config)` reading `config.databaseUrl`.
