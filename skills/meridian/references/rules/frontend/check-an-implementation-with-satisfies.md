## Check an implementation with satisfies

**Default:** Verify a composable meets its port with `implementation satisfies Port`, not a `(): Port` return annotation, when it exposes extra members only the composition root needs.

**When:** Port-implementing composables in Vue/Nuxt — return annotations erase root-only members; `satisfies` preserves them.

Bad: `export const useRivetAuth = (): Auth => { … }`, hiding `clearLocalSession` from the root.
Good: `implementation satisfies Auth; return implementation;`.
