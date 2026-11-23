## Edit only the slice YAML and report

**Law:** Edit only `<case>/<slice>.oracle.yaml` (with your file-editing tool, never `sed` or shell redirects) and your report; never write or edit tests, run `lock`, `results`, `verify`, or git commands, commit, stage, stash, start subagents, or recommend or ask outside YAML `question` fields.

**When:** Running any `filler` pass.

Bad: Editing a test file, running `ledger.mjs lock`, or adding a `Needs from you` section to the filler report.
Good: Editing only `<case>/<slice>.oracle.yaml`, running `<ledger> validate <case>`, writing a facts-only report with a shell heredoc, and replying with that path only.
