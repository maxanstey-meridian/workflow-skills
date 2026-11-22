## Use Zod at untrusted runtime boundaries

**Tooling:** Validate untrusted external data entering TypeScript with Zod.

**When:** TypeScript backend or frontend code at any untrusted runtime boundary.

Bad: `const form = JSON.parse(body) as Form`
Good: `const form = FormSchema.parse(JSON.parse(body))`
