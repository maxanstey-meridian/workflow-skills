## Leave work uncommitted and report facts only

**Law:** Never commit, stage, or stash changes, never start subagents, and never include recommendations or questions in your report; write facts only to `Report:` ending on `RESULT: BUILT` or `RESULT: STOPPED`, and reply with that path only.

**When:** Working on a piece and writing the final build report.

Bad: Running `git add` on changed files, spawning a helper subagent, or ending the report with "Recommend also refactoring Foo.cs".
Good: Leaving all edits uncommitted in the working tree, writing only changed files, Decisions built, commands with exit codes, and `RESULT: BUILT`, and replying with the report path.
