## Let a stateful composable implement the port

**Default:** When an implementation is already reactive and stateful, the composable returns the port-shaped capability and the root provides it directly; add a pure adapter only when there is pure logic worth separating.

**When:** Implementing a port (a type that names a capability) in a Vue or Nuxt frontend.

Bad: an `authAdapter` that only forwards to `useRivetAuth()`.
Good: `provideAuth(useRivetAuth())`.
