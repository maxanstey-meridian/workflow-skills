## Touch only the report and never judge style or recommend

**Law:** Never edit, format, or create any file except your report, never break code by hand to test a check, never run mutation or the full gate, never commit, stage, or start subagents, and never judge style or recommend a fix.

**When:** Checking a round of fixes and writing the critic report.

Bad: Running `task gate`, tweaking a test file to confirm it fails, or adding "Suggest refactoring Helper.cs" to the critic report.
Good: Leaving the tree untouched, writing only the critic report via heredoc with factual grades, and ending on `VERDICT: PASS` or `VERDICT: FAIL`.
