## Add a package only for commodity machinery

**Default:** Add a package for commodity machinery, and write small, fully understood product logic yourself when a package's scope, runtime cost, maintenance state, or semantic mismatch outweighs the code it would replace; every package must earn its place.

**When:** Deciding whether to add a dependency on any stack.

Bad: A date-range package added for one three-line overlap check.
Good: The check written as a pure function.
