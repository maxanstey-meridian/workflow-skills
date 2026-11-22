## Branch on the error channel, not on data

**Tooling:** Branch on `error` or `response.status` from `{ data, error, response }` — never on `data` truthiness, since valid payloads include `false`, `0`, `""`, and `null`.

**When:** Calls to a generated Rivet `openapi-fetch` client.

Bad: `if (!result.data) return null`
Good:
```ts
const result = await client.GET("/api/mappings");
if (result.response.status === 404) return null;
if (result.error !== undefined) return { ok: false as const, error: result.error };
return { ok: true as const, data: result.data };
```
