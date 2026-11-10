## Declare TypeScript functions as const

**Default:** Declare a TypeScript function as a `const`.

**When:** TypeScript on either stack.

Bad: `function toLabel(status: Status) { … }`.
Good: `const toLabel = (status: Status) => …`.
