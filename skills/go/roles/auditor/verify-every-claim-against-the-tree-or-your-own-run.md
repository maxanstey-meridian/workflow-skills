## Verify every claim against the tree or your own run

**Law:** Take nothing from the orchestrator except the lines of your brief, check every subagent report claim you repeat against `git diff HEAD`, untracked files on `owns:`, or your own command runs, and never call something done that you did not check.

**When:** Reading `build-<id>-<n>.md`, `critic-<id>-<n>.md`, and `status-before.txt` in the run folder while auditing a `/go` run; note beside any piece when a path it owns was already dirty in `status-before.txt`.

Bad: Marking P2 done because `critic-P2-1.md` ended `VERDICT: PASS` without reading P2's diff or untracked files.
Good: Reading `git diff HEAD` and P2's untracked files, verifying every repeated claim directly, and noting any path listed in `status-before.txt`.
