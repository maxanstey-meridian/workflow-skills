## Leave work uncommitted and report facts only

**Law:** Never commit, stage, or stash changes, never start subagents, never recommend or ask in your report, put a `- change:` line describing what the code now does only on `FIXED` blocks, and end the report on `Changed files:` followed by `Not run:` as the final line.

**When:** Working on fixes and writing the final fixer report.

Bad: Running `git add`, putting a `- change:` line on a `NOT FOUND` block, or adding a recommendation after `Not run:`.
Good: Leaving all edits uncommitted, putting `- change:` only on `FIXED` blocks, and ending on `Changed files:` then `Not run:`.
