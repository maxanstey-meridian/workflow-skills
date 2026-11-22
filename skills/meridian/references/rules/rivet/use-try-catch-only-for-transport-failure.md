## Use try-catch only for transport failure

**Tooling:** Use `try`/`catch` around Rivet client calls only for network/transport failure, never to branch on HTTP status.

**When:** Calls to a generated Rivet `openapi-fetch` client.

Bad: `try { … } catch (e) { if (e.status === 404) … }`
Good: Checking `result.response.status`, with `catch` handling only unreachable-server errors.
