## TypeScript Client Package

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
