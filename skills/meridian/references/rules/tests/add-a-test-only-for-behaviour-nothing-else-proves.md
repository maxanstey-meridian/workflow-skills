## Add a test only for behaviour nothing else proves

**Default:** A test earns its place by proving behaviour no other test proves, at the cheapest level that proves it.

**When:** Before adding a test.

Bad: a second end-to-end test that repeats a use case test's assertions through the browser.
Good: no new test, because the use case test already proves it.
