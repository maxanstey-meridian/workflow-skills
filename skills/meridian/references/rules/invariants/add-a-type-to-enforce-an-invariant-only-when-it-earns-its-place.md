## Add a type to enforce an invariant only when it earns its place

**Default:** While enforcing an invariant, add a new type only when it shrinks the states that can be represented, centralises a legal transition, or owns a real consistency boundary.

**When:** Deciding whether to add a type while enforcing an invariant (a rule the product must always keep true).

Bad: A `PublishedFormId` wrapper type that holds the same string as `FormId` and rules nothing out.
Good: A `PublishedForm` type with no edit operation, so an edited published form cannot be represented.
