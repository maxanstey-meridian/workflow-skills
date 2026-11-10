## Wrap a dependency only when the wrapper adds meaning

**Default:** Do not wrap a library or a generated client one-for-one, and never merely because the code is generated; add a layer only when it combines several calls into one capability, adds non-trivial policy or orchestration, or translates an external model into the application's own terms (a translation layer) because another team owns it, it changes independently of the application, or tests need an abstraction (an interface the application owns).

**When:** Any stack, around a library, SDK, or generated client (a Rivet client, generated from the API's transport contract, included).

Bad: A `NotesApi.getNotes()` wrapper that only calls the generated `client.GET("/api/notes")`.
Good: Callers use the generated `client.GET("/api/notes")` directly.
