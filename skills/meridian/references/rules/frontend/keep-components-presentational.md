## Keep components presentational

**Default:** A component renders data, holds local UI interaction, emits events, and may inject an already-provided capability; it never calls a generated client, runs a workflow, constructs infrastructure, or reaches round its composition root (the app shell, a layout, or a page).

**When:** Vue components. A feature-container component may consume a provided context to keep orchestration out of leaf components; name and place it so its role is obvious.

Bad: `await client.POST("/api/notes", …)` in a component's click handler.
Good: `const notes = injectNotes(); notes.add(text)`.
