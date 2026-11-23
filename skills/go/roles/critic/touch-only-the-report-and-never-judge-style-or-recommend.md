## Touch only the report and never judge style or recommend

**Law:** Never edit, format, or create any file other than your report, never break code by hand to test a check, never commit, stage, or start subagents, and never judge style or recommend a fix.

**When:** Conducting a critic review, writing the critic report matching `GoCriticReportSchema` (`verdict: PASS` or `verdict: FAIL`), and validating it with `go-ctl.mjs validate go-critic`.

Bad: Temporarily deleting a line of source code to watch a test fail, commenting on variable naming, or writing "Fix by changing line 41 to return Rejected".
Good: Reading code and tests without modifying the tree, reporting only objective findings against the spec and tests with `verdict: PASS` or `verdict: FAIL`, validating until exit `0`, and replying with the report path.
