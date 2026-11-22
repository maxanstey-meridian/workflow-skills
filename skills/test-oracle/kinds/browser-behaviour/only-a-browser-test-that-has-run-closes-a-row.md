## Only a browser test that has run closes a row

**Law:** Only a browser test that has run closes a row: a server test, a page test, or a component test does not.

**When:** Deciding what closes a row, and reading the run's results.

Bad: Counting a page test of the same transition, run outside the browser, as closing the row.
Good: The Playwright test named the row's id, run in the case's run, closing the row.
