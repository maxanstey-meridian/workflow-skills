## Fix the type instead of asserting it

**Law:** Never silence the compiler with a type assertion (`x as T`, `<T>x`) or non-null assertion (`x!`); fix the type at its source via a typed template ref, `v-model`, type guard, or better model.

**When:** TypeScript app and test code, including Vue templates (in tests, type the stand-in response instead of casting). `as const` and `satisfies` are allowed because they check rather than override types.

Bad: `const user = (await response.json()) as User`.
Good: Parsing the response with a schema or type guard returning `User`.
