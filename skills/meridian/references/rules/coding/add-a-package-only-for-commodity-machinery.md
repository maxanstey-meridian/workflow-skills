## Add a package only for commodity machinery

**Default:** Add a package for commodity machinery; write small, well-understood product logic yourself when a package's scope, cost, maintenance, or semantic mismatch outweighs the code it replaces.

**When:** Deciding whether to add a dependency on any stack.

Bad: Adding a date-range package for a three-line overlap check.
Good: Writing the check as a pure function.
