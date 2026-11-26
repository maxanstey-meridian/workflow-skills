## Touch only the report and run read-only checks

**Law:** Never edit any file except your report, never run tests, a typecheck, or the gate, never start subagents, and never add fields or recommendations outside the report schema above.

**When:** Reviewing a slice or a stack; run only read-only `git`, search, and `cycle-ctl.mjs validate review` or `cycle-ctl.mjs validate doctrine-review` commands (plus the repo's doctrine checker or linter over your files when reviewing a stack and the repo's instructions name one).

Bad: Running `dotnet test` during a review, editing a typo in a reviewed file, or adding a `suggestions` key to the YAML report.
Good: Inspecting files with read-only `git` and search commands, writing only the YAML report via heredoc, and validating it with `cycle-ctl.mjs validate review` or `cycle-ctl.mjs validate doctrine-review`.
