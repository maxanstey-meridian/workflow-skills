## Test what the user can do in a UI

**Default:** Test a user interface by what the user can accomplish and understand (prerequisites and ordering, the common path, what is revealed, visible outcomes and previews, consequences, and validation and recovery guidance), not by its control layout or implementation terms.

**When:** Tests of user journeys and setup flows.

Bad: a test that asserts the third `<select>` in the second card has four options.
Good: a test that chooses "In a folder" and asserts the folder builder and the example destination appear.
