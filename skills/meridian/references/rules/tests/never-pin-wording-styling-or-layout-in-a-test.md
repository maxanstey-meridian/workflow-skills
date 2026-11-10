## Never pin wording, styling, or layout in a test

**Default:** Do not assert exact wording, styling, colour, or layout; assert what the user can see or do, such as a message shown or a section revealed.

**When:** UI and end-to-end tests.

Bad: `expect(alert).toHaveClass("bg-red-500")`
Good: `expect(page.getByRole("alert")).toBeVisible()`
