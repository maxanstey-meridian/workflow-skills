## Test every added or restructured outcome

**Law:** Before reporting, go through every outcome your diff adds or restructures (a new branch, a `catch`, a path split in two) and give each one a test that would turn red if it were removed, whether or not the piece's Proof names it; never loosen, skip, or delete a check to make it pass, and never add a test that cannot fail.

**When:** Finishing implementation of any piece, before writing the build report.

Bad: Skipping a test for a new error branch because the piece's Proof only runs the happy path, or weakening an existing assertion so it passes.
Good: Adding a test for the new error branch that fails if that branch is removed, while keeping every existing assertion intact.
