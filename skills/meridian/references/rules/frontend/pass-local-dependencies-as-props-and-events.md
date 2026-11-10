## Pass local dependencies as props and events

**Default:** A dependency between one component and its child is a prop and an event, not a port (a typed capability provided to a whole subtree).

**When:** Vue components. A provided port is visible to a whole subtree, so it is for capabilities the subtree depends on.

Bad: `provideRowSelection(...)` so a table can talk to its own row.
Good: `:selected` and `@select` on the row.
