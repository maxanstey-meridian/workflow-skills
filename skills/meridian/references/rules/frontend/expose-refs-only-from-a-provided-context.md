## Expose refs only from a provided context

**Default:** A capability port exposes plain values and functions; only a provided context, the reactive view-model made for a Vue subtree, exposes `Ref` or `ComputedRef`, and it is not presented as framework-neutral.

**When:** Declaring a port (a type that names a capability) in a Vue or Nuxt frontend.

Bad: a `Storage` port, implemented by a pure adapter, whose methods return `Ref<string>`.
Good: `Storage` returning `string`, and an `Auth` provided context exposing `currentSession: Ref<CurrentUserDto | null>`.
