## Audit commits, gate log, and mutation once

**Law:** Verify every path in `scope.txt` is in one of the cycle's commits or in `left-out.txt` (naming anything else still dirty, omitting `left-out.txt` paths also in `all.txt`, putting `left-out.txt` paths not in `all.txt` into `Needs from you`, and listing `scope.txt` paths absent from every `Files read:` line under `Not checked`); read the gate from `gate.log` without running the full gate (`GATE EXIT 0` is green; `GATE: none named` reports what the repo's instructions lack under `Gate`; `GATE: task could not list Taskfile.yml` is the first finding with its output; a red gate with a fix reruns only the failing commands the log names, and if still red becomes the first finding); and run the repo's mutation command once if named over `git diff --name-only $(cat <run>/base.txt)..HEAD`, reading its `mutation-testing-elements` JSON report with `jq` to list survivors on changed lines (`git diff -U0 $(cat <run>/base.txt)..HEAD`), sending nothing for fixing, reporting any `git status --short` change before vs after under `Findings`, or saying no mutation command is named under `Mutation`.

**When:** Auditing commit coverage, gate status, and mutation results for `<run>/report.md`.

Bad: Re-running `task gate` during the audit, ignoring an unread `scope.txt` file, or omitting a new dirty file that appeared in `left-out.txt`.
Good: Checking `scope.txt` against commits and `Files read:`, reading `gate.log` directly, and running mutation once only when the repo's instructions name a mutation command.
