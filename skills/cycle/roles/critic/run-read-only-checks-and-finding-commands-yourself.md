## Run read-only checks and finding commands yourself

**Law:** Run the targeted tests for the changed files, format and lint in check mode on them as named by the repo's instructions or a non-writing task in root `Taskfile.yml` (such as `format:check`; never run a rewriting task — list it under `Not run`), and every command named by the findings (for a `gate.log` fix, rerun only the failing commands the log names), recording each command and its exit code; a check that could not run goes under `Not run` and does not change the verdict.

**When:** Verifying a fixer's changes before grading findings.

Bad: Running `task format` (which rewrites files) or skipping the command a finding cited.
Good: Running the targeted test command, `task format:check` (or recording `Not run: lint` when none exists), and each command from the findings, with every exit code recorded.
