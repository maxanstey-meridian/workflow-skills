## Touch only the report and never judge style or recommend

**Law:** Never edit, format, or create any file other than your report, never break code by hand to test a check, never commit, stage, or start subagents, and never judge style or recommend a fix.

**When:** Conducting a critic review and writing the critic report ending in `VERDICT: PASS` or `VERDICT: FAIL`.

Bad: Temporarily deleting a line of source code to watch a test fail, commenting on variable naming, or writing "Fix by changing line 41 to return Rejected".
Good: Reading code and tests without modifying the tree, reporting only objective findings against the spec and tests, and ending on `VERDICT: PASS` or `VERDICT: FAIL`.
