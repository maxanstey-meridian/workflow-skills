## Mocks

Mocks are allowed, but they should isolate volatility, not replace the whole world.

Default stance:

- do not mock unless there is a concrete reason
- prefer the real dependency if it is cheap enough
- prefer a fake only when the real thing is too heavy, slow, unstable, or operationally awkward for the test

Good reasons to mock:

- non-deterministic external systems
- expensive boundaries
- unstable infrastructure
- rare failure cases

Good reasons to use a fake:

- storage or transport is too heavy for the test but the behavioural contract still matters
- a cheaper in-memory implementation can exercise the same capability honestly
- the real dependency would make the test operationally brittle

A fake covers behavior above the port; it does not cover the real adapter.
Where semantic drift is plausible, run the same behavioral contract tests
against the fake and every real adapter.

Bad reasons to mock or fake:

- avoiding proper seams
- testing internal call order instead of behaviour
- making tightly coupled code appear testable
- making the test easier to write at the cost of realism
