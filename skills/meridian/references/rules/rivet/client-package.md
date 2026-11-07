## Rivet Client Package

The contracts package is the workspace package UI apps import the generated
Rivet client and DTO types from. Its sections are one design and are read
together: each assumes the others.

### Generated Output

Generated Rivet output lives in a workspace package, `packages/contracts`,
consumed through its `exports` map (`@<scope>/contracts`, or a `./client`
subpath), never an in-app directory.

- generated code is read-only; exclude from lint
- regenerate via the repo's task convention (`task generate`, `pnpm rivet`, or `dotnet rivet --project ... --output ...`)
- commit regenerated output with the contract change that caused it
- `--verify` is the CI drift gate

Source of the standard facade: https://github.com/maxanstey-meridian/rivet-ts/blob/main/src/infrastructure/codegen/client-package-emitter.ts

### TypeScript Client Package

The frontend contract package has:

- `generated/openapi.json` — OpenAPI 3.1 emitted from the authored Rivet contract
- `generated/schema.d.ts` — `openapi-typescript` output over that spec
- `src/index.ts` — the hand-owned client facade consumed by UI apps

Standard facade shape:

```ts
import createOpenApiClient, { type Client, type ClientOptions } from "openapi-fetch";
import type { paths } from "../generated/schema.js";

export type { components, paths } from "../generated/schema.js";

export type RivetFetch = (input: Request) => Promise<Response>;
export type RivetConfig = Omit<ClientOptions, "baseUrl" | "fetch"> & {
  readonly baseUrl?: string;
  readonly fetch?: RivetFetch;
};
export type RivetClient = Client<paths>;

export const createClient = (config: RivetConfig = {}): RivetClient =>
  createOpenApiClient<paths>(config);

export let client: RivetClient = createOpenApiClient<paths>();

export const configureRivet = (config: RivetConfig): void => {
  client = createClient(config);
};
```

Rules:
- UI imports `client`, `createClient`, `configureRivet`, and DTO types from the contracts package
- UI does not create `openapi-fetch` clients directly
- regeneration updates `generated/`; the facade is hand-owned after scaffold
- do not wrap the generated client one-for-one in a fake API service

### Frontend Result Handling

The client is an `openapi-fetch` facade. Capture its `{ data, error,
response }` result and inspect the error channel or response status explicitly:

```ts
const result = await client.GET("/api/mappings");
if (result.response.status === 404) return null;
if (result.error !== undefined) return { ok: false as const, error: result.error };
return { ok: true as const, data: result.data };
```

Do not narrow on `result.data` truthiness: valid payloads may be `false`, `0`,
an empty string, or null. `try/catch` is for transport/network failure only;
never use catch for HTTP status branching.

Legacy Rivet v1 clients use `{ unwrap: false }` plus `.isOk()` /
`.isNotFound()`. Do not copy that API into v2 code.
