## Call the generated client in the implementing composable

**Default:** Call the generated API client inside the composable or adapter that implements the capability, never in a component.

**When:** Vue and Nuxt frontends using a generated client (e.g., Rivet).

Bad: `client.GET("/api/session")` called in a component.
Good: The same call inside `useRivetAuth`.
