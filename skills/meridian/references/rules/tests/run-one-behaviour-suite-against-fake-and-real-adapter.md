## Run one behaviour suite against fake and real adapter

**Default:** Where a fake could drift from the real adapter (the implementation of a port), run one suite of the behaviour callers rely on against the fake and against every real adapter.

**When:** A port (the application-owned type that names a capability) with a hand-written fake and a real adapter whose behaviour matters to callers.

Bad: `InMemoryFormRepository` tested on its own.
Good: one `FormRepositoryBehaviourTests` suite run against both `InMemoryFormRepository` and `EfFormRepository`.
