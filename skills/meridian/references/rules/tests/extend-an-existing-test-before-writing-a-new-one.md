## Extend an existing test before writing a new one

**Default:** Extend an existing test before writing a new one for new behaviour.

**When:** Adding a test for new behaviour.

Bad: a new test file that repeats forty lines of setup to assert one more field.
Good: one more assertion in the existing test.
