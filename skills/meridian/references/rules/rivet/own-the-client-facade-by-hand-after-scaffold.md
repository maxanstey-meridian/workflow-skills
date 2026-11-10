## Own the client facade by hand after scaffold

**Tooling:** `src/index.ts` in the contracts package is the client facade, scaffolded in the standard shape and hand-owned from then on; regeneration updates only `generated/`.

**When:** The contracts package (the workspace package that holds the generated client) of a Rivet API; Rivet reads C# and emits the OpenAPI document. The standard shape is the emitter's output.

Bad: a generator step that overwrites `src/index.ts` on every regeneration.
Good: the facade below, edited by hand and left alone by generation:
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
