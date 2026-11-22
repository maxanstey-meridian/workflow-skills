## Shape a port around operations, not DTOs

**Default:** Give each feature concern one port shaped around the UI's needed operations — not one port per function, DTO, or generated client.

**When:** Declaring ports in Vue/Nuxt frontends (ports name subtree capabilities, not wrappers disguising a client).

Bad: `CurrentUserDtoPort`, or `NotesApi` mirroring generated methods.
Good: `Auth` with `currentSession` and `load()`.
