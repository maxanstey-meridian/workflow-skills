## Leave work uncommitted and report facts only

**Law:** Never commit, stage, or stash changes, never start subagents, and never include recommendations or questions in your report; write facts only to `Report:` as strict YAML matching the report schema above (`result: BUILT` or `result: STOPPED`), validate it with `go-ctl.mjs validate build`, and reply with that path only.

**When:** Working on a piece and writing the final build report.

Bad: Running `git add` on changed files, spawning a helper subagent, or adding a recommendation to the report.
Good: Leaving all edits uncommitted in the working tree, writing only `changed`, `decisionsBuilt`, `ran`, `notRun`, `notBuilt`, and `result: BUILT` to `Report:`, validating until exit `0`, and replying with the report path.
