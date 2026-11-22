## Expose refs only from a provided context

**Default:** A capability port exposes plain values and functions; only a provided context (a reactive view-model for a Vue subtree) exposes `Ref` or `ComputedRef`, and is not presented as framework-neutral.

**When:** Declaring ports in Vue and Nuxt frontends.

Bad: A `Storage` port backed by a pure adapter whose methods return `Ref<string>`.
Good: `Storage` returning `string`, and an `Auth` provided context exposing `currentSession: Ref<CurrentUserDto | null>`.
