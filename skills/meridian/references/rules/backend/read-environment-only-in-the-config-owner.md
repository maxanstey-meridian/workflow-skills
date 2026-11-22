## Read environment only in the config owner

**Default:** Read environment variables only in root config or bootstrap files; pass the validated config object everywhere else by injection.

**When:** TypeScript server code. Owners are `config.{ts,mts,cts}`, `config/**`, `bootstrap.{ts,mts,cts}`, or `bootstrap/**` at each package root (optionally under `src/`; never inside a module). Outside owners: no `process.env`, `globalThis.process.env`, `Bun.env`, `Deno.env`, or `env` from `process`/`node:process`. Root build configs (`*.config.{ts,mts,cts}`) are exempt. Add new variables to the owner's schema (e.g., Zod in `src/config.ts`).

Bad: `const url = process.env.DATABASE_URL` in a repository.
Good: `constructor(private readonly config: Config)` reading `config.databaseUrl`.
