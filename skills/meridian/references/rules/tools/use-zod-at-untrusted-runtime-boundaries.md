## Use Zod at untrusted runtime boundaries

**Tooling:** Use Zod to validate data at an untrusted runtime boundary, where data enters TypeScript from outside.

**When:** TypeScript on either stack (backend or Nuxt frontend), wherever data crosses into the program from outside.

Bad: `const form = JSON.parse(body) as Form` treats unchecked input as a typed value.
Good: `const form = FormSchema.parse(JSON.parse(body))` checks the shape before the value is used.
