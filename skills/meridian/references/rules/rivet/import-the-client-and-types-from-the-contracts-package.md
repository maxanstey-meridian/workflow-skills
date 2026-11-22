## Import the client and types from the contracts package

**Tooling:** Import `client`, `createClient`, `configureRivet`, and DTO types from the contracts package; never instantiate `openapi-fetch` directly in UI code.

**When:** Frontends calling a Rivet API.

Bad: `createOpenApiClient<paths>({ baseUrl })` in a composable.
Good: `import { client } from "@<scope>/contracts"` in the composable.
