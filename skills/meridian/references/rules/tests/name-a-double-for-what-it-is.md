## Name a double for what it is

**Preference:** Use `Fake*` for a behavioural fake, `InMemory*` for an in-memory implementation of a storage or transport port (the application-owned type that names a capability), and `Inline*` for a synchronous stand-in for an async dispatcher, rather than `Mock*` or `Stub*`.

**When:** Hand-written test doubles (stand-ins for a real dependency) on any stack.

Bad: `MockFormRepository`
Good: `InMemoryFormRepository`
