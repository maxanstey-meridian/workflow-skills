## Run one behaviour suite against fake and real adapter

**Default:** Where a fake could drift from the real adapter, run one shared behaviour suite against the fake and every real adapter.

**When:** Any port with both a hand-written fake and a real adapter whose behaviour matters to callers.

Bad: Testing `InMemoryFormRepository` on its own.
Good: Running one `FormRepositoryBehaviourTests` suite against both `InMemoryFormRepository` and `EfFormRepository`.
