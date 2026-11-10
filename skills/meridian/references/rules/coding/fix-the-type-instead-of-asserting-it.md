## Fix the type instead of asserting it

**Law:** Do not quiet the compiler with a type assertion (`x as T`, `<T>x`) or a non-null assertion (`x!`); fix the type at its source with a typed template ref, `v-model`, a type guard, or a better model.

**When:** TypeScript app code and test code, Vue template expressions included (in a test, type the stand-in response rather than cast it). `as const` and `satisfies` are allowed: they check a type rather than override it.

Bad: `const user = (await response.json()) as User`.
Good: The response parsed by a schema or type guard that returns `User`.
