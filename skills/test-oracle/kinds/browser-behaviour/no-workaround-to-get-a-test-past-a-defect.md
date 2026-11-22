## No workaround to get a test past a defect

**Law:** No workaround to get a test past a defect: no `force`, no `.first()`, `.last()`, or `.nth()`, no `nth-child`, no `waitForTimeout`, no `.catch(`, no `try` around an assertion, no request interception, no type assertion, no keyboard in place of a click, no reload the source doesn't have, no direct API call in place of what the person does.

**When:** Every test of the case, and every helper it calls.

Bad: A click with `force: true`, or `.first()` on two buttons sharing a name, to get the test past the duplicate.
Good: The click on the one button the page offers, and the duplicate names reported as the defect they are.
