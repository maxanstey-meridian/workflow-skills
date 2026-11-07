## Test Doubles

The default double is a **hand-rolled fake**; a mocking
library (NSubstitute, `vi.mock`) stays legal at narrow seams — density is the
smell, not presence. A file built from many `Substitute.For<>` calls is mock
soup; one substitute at a genuinely volatile boundary is fine.

Conventions:

- doubles live in `TestSupport/{Module}/`; in a TypeScript test tree, a
  lowercase `support/` folder inside it (`tests/support/`, `test/support/`)
- naming vocabulary: `Fake*` (behavioral fake), `InMemory*` (in-memory
  implementation of a storage/transport port), `Inline*` (synchronous stand-in
  for an async dispatcher). Never `Mock*`/`Stub*` for hand-rolled doubles — the
  name should say what the double *is*, not that it is a double of some kind
- test classes build their subject through a private `CreateUseCase()` factory
- inject `TimeProvider` (or the `Clock` port) rather than reading time ambiently

A stand-in API response (a Playwright `route.fulfill` body, a mocked client
result) is typed against the generated contract, with
`satisfies components["schemas"]["…"]` or a typed fixture helper, so a contract
change breaks the test at compile time instead of leaving it to drift.
