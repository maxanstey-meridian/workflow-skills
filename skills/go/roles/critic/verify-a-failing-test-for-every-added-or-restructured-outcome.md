## Verify a failing test for every added or restructured outcome

**Law:** List every materially distinct outcome the piece's diff adds or restructures (a new error path, a moved `catch`, a new validation rule or rendered section), read the tests to confirm at least one test covers it and would fail if that outcome were broken, and raise an `Unproven` finding only when an entire outcome has no covering test — never manually mutate individual boolean clauses or sibling conditions of an already-tested outcome.

**When:** Checking a piece's diff against its tests on attempt 1 (on attempt 2, check only that attempt 1's findings are resolved); "it had no test before" is not a pass (a diff touching an outcome owns its proof), and several branches or sibling conditions that produce the same outcome (such as two tags on one `if`, or `\` vs `/` on a path check) need one test, not one each.

Bad: Passing a moved `catch` block with no test because "that method had no tests before", or failing a piece because a test checked `security` on `tag !== "data-loss" && tag !== "security"` without also testing `data-loss`.
Good: Reading the test assertions for every added or restructured outcome and reporting `Unproven: SlotDecider.cs:54 catch returns Conflict; deleting the catch leaves all tests green`, while leaving clause-level mutation testing to the repo's mutation tool in `/cycle`.
