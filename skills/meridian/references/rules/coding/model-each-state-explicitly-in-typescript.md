## Model each state explicitly in TypeScript

**Default:** Model each state a value can be in as its own case of a union, instead of optional fields read with `?.` and `??`.

**When:** TypeScript on either stack.

Bad: `{ data?: Row[]; error?: string }` read as `state.data ?? []`.
Good: `{ kind: "loading" } | { kind: "loaded"; data: Row[] } | { kind: "failed"; error: string }`.
