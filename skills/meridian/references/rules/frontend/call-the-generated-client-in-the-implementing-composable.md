## Call the generated client in the implementing composable

**Default:** Call the generated client (the typed API client generated from the transport contract) inside the composable or adapter that implements the capability, not in a component.

**When:** Vue and Nuxt frontends that call a generated API client (a Rivet client, for example).

Bad: `client.GET("/api/session")` called in a component.
Good: the same call inside `useRivetAuth`.
