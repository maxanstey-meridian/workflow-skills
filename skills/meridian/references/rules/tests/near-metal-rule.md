## Near-Metal Rule

Keep tests as close to the real runtime path as practical.

That usually means:

- prefer real wiring over mocked wiring
- prefer real feature flows over isolated call-sequence tests
- prefer lifecycle/integration tests over synthetic unit shells when the behaviour crosses a seam

The default question is:

- “Can this be tested through the real boundary instead?”

If yes, do that.
