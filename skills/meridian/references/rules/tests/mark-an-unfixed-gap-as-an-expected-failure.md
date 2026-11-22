## Mark an unfixed gap as an expected failure

**Default:** When a test hits a reported unfixed gap, mark it as an expected failure naming that work — never skip it — so the suite goes red when the gap is fixed and the mark gets removed.

**When:** Tests asserting intended behaviour not yet met (Playwright: `test.fail()`; other frameworks: their expected-failure mark).

Bad: `test.skip("rounds half up", async () => { … })`
Good: `test.fail("rounds half up (issue 412)", async () => { … })`
