## Test through the real boundary when you can

**Default:** When behaviour crosses a boundary, test it through the real wiring and the real flow rather than an isolated unit with the wiring mocked.

**When:** A behaviour that spans a use case (the Application code for one operation) and its adapters (the implementations of the ports it needs), or a page and its composables.

Bad: a controller test with the use case mocked, and a use case test with the repository mocked.
Good: one test that posts to the real host and reads the row back.
