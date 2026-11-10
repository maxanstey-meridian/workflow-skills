## Use real dependencies first, fakes second, mocks last

**Default:** Use the real dependency when it is cheap enough, a hand-written fake (a working stand-in) when the real thing is too heavy, slow, or unstable for the test, and a mock (a stand-in from a mocking library) only at a narrow, volatile boundary; do not build the test around mocks first.

**When:** Choosing a stand-in in any test. Reasons for a mock: a non-deterministic external system, an expensive boundary, unstable infrastructure, a rare failure case. Reasons for a fake: storage or transport is too heavy for the test but the behaviour callers rely on still matters, a cheaper in-memory implementation can exercise the same capability honestly, or the real dependency would make the test brittle. Not reasons for either: avoiding a proper port (the application-owned type that names a capability), testing call order, making coupled code look testable, or making the test easier to write at the cost of realism.

Bad: a use case test built from five `Substitute.For<>()` calls.
Good: the real use case with an in-memory fake repository and one substitute for the payment gateway.
