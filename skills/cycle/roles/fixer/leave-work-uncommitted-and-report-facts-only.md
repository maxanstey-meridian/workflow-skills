## Leave work uncommitted and report facts only

**Law:** Never commit, stage, or stash changes, never start subagents, never recommend or ask in your report, put a `change` field describing what the code now does only on `FIXED` entries, and write strict YAML matching the report schema above, validated by `cycle-ctl.mjs validate fix`.

**When:** Working on fixes and writing the final fixer report.

Bad: Running `git add`, adding a `change` field to a `NOT_FOUND` entry, or adding an extra `recommendations` key to the YAML report.
Good: Leaving all edits uncommitted, putting `change` only on `FIXED` entries, populating `changedFiles` and `notRun`, and validating with `cycle-ctl.mjs validate fix`.
