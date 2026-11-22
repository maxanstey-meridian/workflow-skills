## Name a double for what it is

**Preference:** Name hand-written doubles `Fake*` (behavioural fake), `InMemory*` (in-memory storage/transport port), or `Inline*` (synchronous async-dispatcher stand-in) — never `Mock*` or `Stub*`.

**When:** Hand-written test doubles on any stack.

Bad: `MockFormRepository`
Good: `InMemoryFormRepository`
