## Verify a failing test for every added or restructured outcome

**Law:** List every outcome the piece's diff adds or restructures (a new branch, a moved `catch`, a path split in two), read the tests to find one that would turn red if it were removed, and raise an `Unproven` finding naming the outcome and the change that would go unnoticed whenever none exists.

**When:** Checking a piece's diff against its tests; "it had no test before" is not a pass (a diff touching an outcome owns its proof), and several branches that produce one outcome need one test, not one each.

Bad: Passing a moved `catch` block with no test because "that method had no tests before", or accepting a test without reading its assertions.
Good: Reading the test assertions for every added or restructured outcome and reporting `Unproven: SlotDecider.cs:54 catch returns Conflict; deleting the catch leaves all tests green`.
