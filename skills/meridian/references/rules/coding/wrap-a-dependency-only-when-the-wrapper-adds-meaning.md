## Wrap a dependency only when the wrapper adds meaning

**Default:** Never wrap a library or generated client one-for-one (nor just because it is generated); add a wrapper only when it combines calls into one capability, adds non-trivial policy or orchestration, or translates an external model owned elsewhere, changing independently, or needing a test abstraction.

**When:** Any stack, around a library, SDK, or generated client (including Rivet clients).

Bad: A `NotesApi.getNotes()` wrapper that only calls generated `client.GET("/api/notes")`.
Good: Callers using `client.GET("/api/notes")` directly.
