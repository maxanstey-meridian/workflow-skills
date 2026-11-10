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
