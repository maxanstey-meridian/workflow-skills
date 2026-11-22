## Keep components presentational

**Default:** A component renders data, holds local UI state, emits events, and may inject a provided capability; it never calls a generated client, runs workflows, constructs infrastructure, or bypasses its composition root.

**When:** Vue components. Feature-container components may consume a provided context to keep orchestration out of leaf components; name and place them clearly.

Bad: `await client.POST("/api/notes", …)` in a component's click handler.
Good: `const notes = injectNotes(); notes.add(text)`.
