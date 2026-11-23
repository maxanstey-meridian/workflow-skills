## Run targeted checks and generation without the full gate

**Law:** Run the targeted tests, format, and lint for the files you changed as named by the repo's instructions or root `Taskfile.yml` (`task --list-all` prints them), run the repo's build or generation command and its check whenever you changed a source file that generates other files (never hand-editing generated files), list every file any command rewrote in `changedFiles` even if outside `Files:`, never run the full gate, and record any check neither the instructions nor the Taskfile defines in `notRun`.

**When:** Verifying fixes before writing the fixer report.

Bad: Running `task gate`, hand-editing a generated file, or omitting a formatter-rewritten file from `changedFiles`.
Good: Running the targeted tests, `node lib/build-roles/src/cli.ts`, and the defined formatter, listing every rewritten file in `changedFiles`, and recording `{ check: lint, reason: ... }` in `notRun` when none is defined.
