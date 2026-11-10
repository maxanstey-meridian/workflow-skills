## Branch on the error channel, not on data

**Tooling:** Capture the client's `{ data, error, response }` result and branch on `error` or `response.status`; never on whether `data` is truthy, since a valid payload may be `false`, `0`, an empty string, or `null`.

**When:** Calls to the generated `openapi-fetch` client of a Rivet API (Rivet reads C# and emits the OpenAPI document).

Bad: `if (!result.data) return null`
Good:
```ts
const result = await client.GET("/api/mappings");
if (result.response.status === 404) return null;
if (result.error !== undefined) return { ok: false as const, error: result.error };
return { ok: true as const, data: result.data };
```
