## Let a stateful composable implement the port

**Default:** When an implementation is already reactive and stateful, let the composable return the port shape and provide it directly; add a pure adapter only when pure logic is worth separating.

**When:** Implementing a port in Vue/Nuxt frontends.

Bad: An `authAdapter` that only forwards to `useRivetAuth()`.
Good: `provideAuth(useRivetAuth())`.
