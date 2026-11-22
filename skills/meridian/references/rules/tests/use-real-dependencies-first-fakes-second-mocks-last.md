## Use real dependencies first, fakes second, mocks last

**Default:** Prefer the real dependency when cheap enough, a hand-written fake when the real thing is too heavy, slow, or unstable, and a library mock only at a narrow, volatile boundary — never default to mocks.

**When:** Choosing test doubles. Mock for: non-deterministic external systems, expensive boundaries, unstable infrastructure, or rare failures. Fake when: real storage or transport is too heavy or brittle, yet caller-facing behaviour still matters and an in-memory implementation exercises it honestly. Never mock or fake to avoid a proper port, test call order, make coupled code look testable, or trade realism for convenience.

Bad: A use case test built from five `Substitute.For<>()` calls.
Good: The real use case with an in-memory fake repository and one substitute for the payment gateway.
