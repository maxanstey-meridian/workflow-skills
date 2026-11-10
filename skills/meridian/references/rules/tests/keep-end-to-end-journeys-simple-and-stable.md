## Keep end-to-end journeys simple and stable

**Default:** Keep each end-to-end journey simple and happy-path first, with role or test-id selectors, no sleeps, and no state shared between tests.

**When:** End-to-end tests.

Bad: `await page.waitForTimeout(2000); await page.click(".btn-primary")`
Good: `await page.getByRole("button", { name: "Save" }).click()`
