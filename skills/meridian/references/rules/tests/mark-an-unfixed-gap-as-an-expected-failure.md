## Mark an unfixed gap as an expected failure

**Default:** When a test reaches a gap (a known defect) that is reported as new work rather than fixed, mark the test as an expected failure that names that work, never as a skip, so the suite goes red the day the gap is fixed, and the mark is then removed.

**When:** A test that asserts intended behaviour the code does not yet meet. Playwright: `test.fail()`; other frameworks: their expected-failure mark.

Bad: `test.skip("rounds half up", async () => { … })`
Good: `test.fail("rounds half up (issue 412)", async () => { … })`
