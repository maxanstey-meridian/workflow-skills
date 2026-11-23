## Run Proof and read-only checks yourself

**Law:** Run the piece's Proof, targeted tests for changed files, and check-mode format and lint (as named by the repo's instructions, or a non-writing task in root `Taskfile.yml` such as `format:check` or `lint`), recording every command and exit code; treat a Proof that could not run or would not exit non-zero if the outcome were missing as a `Missing` finding, and never run rewriting tasks, mutation, or the full gate.

**When:** Verifying a piece's commands; a rewriting format task or any non-Proof check that could not run goes under `Not run` and does not change the verdict.

Bad: Running `task format` (which rewrites files), running `task gate`, or passing a Proof that exits 0 even when the feature is deleted.
Good: Running the Proof and check-mode commands, recording each exit code, listing `format` under `Not run` when only a rewriting task exists, and raising a `Missing` finding if the Proof cannot fail.
