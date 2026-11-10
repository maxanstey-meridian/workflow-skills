## Import the client and types from the contracts package

**Tooling:** UI code imports `client`, `createClient`, `configureRivet`, and DTO types from the contracts package (the workspace package that holds the generated Rivet client) and never creates an `openapi-fetch` client itself.

**When:** Frontends that call a Rivet API (Rivet reads C# and emits the OpenAPI document).

Bad: `createOpenApiClient<paths>({ baseUrl })` in a composable.
Good: `import { client } from "@<scope>/contracts"` in the composable.
