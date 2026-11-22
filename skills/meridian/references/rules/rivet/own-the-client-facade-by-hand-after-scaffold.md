## Own the client facade by hand after scaffold

**Tooling:** Scaffold `src/index.ts` in the contracts package in the standard shape, then own it by hand; regeneration updates only `generated/`.

**When:** The contracts package of a Rivet API. The standard shape is the emitter's output.

Bad: A generator step that overwrites `src/index.ts` on every regeneration.
Good: The facade below, edited by hand and left untouched by generation:
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

Links: [the client package emitter](https://github.com/maxanstey-meridian/rivet-ts/blob/main/src/infrastructure/codegen/client-package-emitter.ts)
