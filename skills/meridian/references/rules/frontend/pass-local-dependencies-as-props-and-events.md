## Pass local dependencies as props and events

**Default:** Communicate between a parent component and its child via props and events, not a provided port.

**When:** Vue components — a provided port is visible to the whole subtree, so reserve it for subtree-wide capabilities.

Bad: `provideRowSelection(...)` for a table talking to its own row.
Good: `:selected` and `@select` on the row.
