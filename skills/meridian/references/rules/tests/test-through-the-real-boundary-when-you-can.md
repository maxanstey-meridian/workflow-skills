## Test through the real boundary when you can

**Default:** Test cross-boundary behaviour through the real wiring and flow rather than an isolated unit with mocked wiring.

**When:** Behaviour spanning a use case and its adapters, or a page and its composables.

Bad: A controller test mocking the use case plus a use-case test mocking the repository.
Good: One test posting to the real host and reading the row back.
