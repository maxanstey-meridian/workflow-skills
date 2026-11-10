## Check an implementation with satisfies

**Default:** Check that a composable's result meets its port with `implementation satisfies Port`, not a `(): Port` return annotation, when it has members only the composition root needs.

**When:** Composables that implement a port (a type that names a capability) in a Vue or Nuxt frontend. The annotation erases the richer type, so the root cannot reach its extra members; `satisfies` keeps it.

Bad: `export const useRivetAuth = (): Auth => { … }`, which hides `clearLocalSession` from the root.
Good: `implementation satisfies Auth; return implementation;`.
