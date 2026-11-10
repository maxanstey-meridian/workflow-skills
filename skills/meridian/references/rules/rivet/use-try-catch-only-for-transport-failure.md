## Use try-catch only for transport failure

**Tooling:** Use `try`/`catch` around a client call only for network or transport failure, never to branch on an HTTP status.

**When:** Calls to the generated `openapi-fetch` client of a Rivet API (Rivet reads C# and emits the OpenAPI document).

Bad: `try { … } catch (e) { if (e.status === 404) … }`
Good: the status read from `result.response.status`, with `catch` only setting "could not reach the server".
