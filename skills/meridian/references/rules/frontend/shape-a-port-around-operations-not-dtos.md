## Shape a port around operations, not DTOs

**Default:** Give each feature concern one port (a type that names a capability the UI needs), shaped around the operations the UI needs from that boundary, not one port per function, per DTO, or per generated client.

**When:** Declaring a port in a Vue or Nuxt frontend. A port is for a capability the subtree depends on, not for disguising an existing client.

Bad: `CurrentUserDtoPort`, or `NotesApi` mirroring the generated methods.
Good: `Auth` with `currentSession` and `load()`.
