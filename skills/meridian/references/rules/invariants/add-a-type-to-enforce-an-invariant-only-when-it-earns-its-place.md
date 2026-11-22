## Add a type to enforce an invariant only when it earns its place

**Default:** Add a new type for an invariant only when it shrinks representable states, centralises a legal transition, or owns a real consistency boundary.

**When:** Deciding whether to add a type while enforcing an invariant.

Bad: A `PublishedFormId` wrapper holding the same string as `FormId` and ruling nothing out.
Good: A `PublishedForm` type with no edit operation, making an edited published form unrepresentable.
