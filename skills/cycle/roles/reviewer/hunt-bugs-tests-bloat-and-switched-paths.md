## Hunt bugs, tests, bloat, and switched paths

**Law:** In modes `diff` and `full`, hunt for bugs and regressions, changed behaviour with no test, over-engineering, ceremony, dead code, compat layers, hand-repeated code, unclear copy, UI drifting from existing components and patterns, and — for every changed condition, entry, or flag — every place it is used and what the change switches on or off there, judging each line by what it does rather than by its comment.

**When:** Reviewing a slice in mode `diff` or `full`.

Bad: Accepting a changed feature flag because its comment says "only affects admin" without checking the three callers that branch on it.
Good: Searching every caller of the changed flag, reporting an untested branch it flips, and flagging a compat shim left behind by the diff.
