## Delete a test your change makes redundant

**Default:** A change that makes a test redundant deletes that test in the same change.

**When:** Any change that moves or replaces tested behaviour.

Bad: a unit test left behind for a helper the change inlined.
Good: the helper's test deleted in the same commit as the inlining.
