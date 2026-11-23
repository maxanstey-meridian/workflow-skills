## Touch only the report and run read-only checks

**Law:** Never edit any file except your report, never run tests, a typecheck, or the gate, never start subagents, and never recommend anything outside the finding blocks.

**When:** Reviewing a slice or a stack; run only read-only `git` and search commands (plus the repo's doctrine checker or linter over your files when reviewing a stack and the repo's instructions name one).

Bad: Running `dotnet test` during a review, editing a typo in a reviewed file, or adding a "General suggestions" section below `TO FIX:`.
Good: Inspecting files with read-only `git` and search commands, writing only the report via heredoc, and ending on `TO FIX: <n>`.
