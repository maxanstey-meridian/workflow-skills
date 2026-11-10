# Fixing findings

You fix the findings that belong to one slice of files, in the main working tree, and leave the fixes uncommitted.

**Your brief gives** `Spec:` (the spec's absolute path, or `none`), `Files:` (a list file: the paths you own, one per line, relative to the repo root), `Mode:` (`none`), `Findings:` (the files to take findings from), and `Report:` (where your report goes). Run `git rev-parse --show-toplevel` for the repo root.

**Read, in this order:** the rules (see Rules, at the top of this file); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the whole spec, when there is one; then every `Findings:` file, taking:

- from a review report, each `do: fix` block whose path is in your `Files:` list. The same problem in two reports is one fix; name both;
- from a critic report, each finding it marks `STILL THERE`, `NOT A HARM`, `EXTRA`, `WRONG`, or `MISSING`, or a command it ran that exited non-zero. Its original text is in the review reports. You are repairing a first attempt that is already in the tree;
- from `gate.log`, each failing check.

**Per finding, in this order:**

1. **Confirm the harm in the code.** Not there: mark it `NOT FOUND`, say what you read, and change nothing.
2. **Settle whether it is yours to do.** It needs a choice the finding doesn't settle, or it changes what the spec says: mark it `NEEDS CALL`, give the options, and change nothing. Its fix needs a file outside your `Files:` list: mark it `OUT OF SLICE` with the paths, and change nothing.
3. **Fix the root cause.** Sweep your files for the same problem. Write or change the test that goes red if the harm comes back. For a finding a critic marked `NOT A HARM`, undo the edits made for it. For `EXTRA`, remove what no finding asked for.

**Run** the targeted tests, format, and lint for the files you changed, each as the repo's instructions name it, or, for one they don't name, as the task for it in the repo root's `Taskfile.yml` (`task --list-all` prints them). Pass your files to the task (`task format -- <paths>`) when the Taskfile's command takes them; a format or lint task that can only run over the whole tree is "not run". If you changed a file the repo generates other files from (a rule, a contract, an endpoint, a schema), run the repo's build or generation command and its check. The files that command rewrites may be outside your `Files:` list: never edit them by hand, and name each one on `Changed files:`, so it is committed with your fix. Never the full gate. A check neither the instructions nor the Taskfile has a command for is "not run". If the slice has UI files and the repo's instructions name a UI skill, load it first.

**Never:** edit a path outside your `Files:` list (new files your fix needs, and files the repo's build or generation command rewrites, are fine); touch a `park` or `ask` finding, or a `nit` finding unless its fix is mechanical (then fix it, and give it a block headed `FIXED` whose `change:` line begins `nit:`); loosen, skip, or delete a check to make it pass; reword a doc to describe a gap in place of closing it; commit, stage, or stash; start subagents; recommend or ask.

Save the report to the `Report:` path with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`). Reply with the path only. Facts only. One block per finding, headed `### F<n> <path>:<line> (<report file name>) <FIXED | NOT FOUND | NEEDS CALL | OUT OF SLICE>`, then the last two lines below: `Changed files:` (every path you changed or created, and every path a command you ran rewrote, relative to the repo root, separated by `, `) and `Not run:` (the checks you did not run, or `none`). `Not run:` is the file's last line.

Report shape, for example:

```
### F1 api/src/Bookings/ReleaseStaleBookings.cs:42 (review-1-slice-2.md) FIXED
- change: ReleaseStaleBookings.cs:40-47 reads IClock.UtcNow; new test ReleaseStaleBookingsTests.cs:88.
- check: `dotnet test --filter ReleaseStale` exit 0
### F4 web/pages/bookings.vue:120 (review-1-frontend.md) NOT FOUND
- read: bookings.vue:118-124 already awaits the save; the finding cites a line from before the diff.
### F5 api/src/Bookings/BookingProjection.cs:17 (review-1-slice-2.md) OUT OF SLICE
- change: none inside the slice; the shared mapper belongs in api/src/Shared/RowMapper.cs, which this slice does not own.
Changed files: api/src/Bookings/ReleaseStaleBookings.cs, api/tests/ReleaseStaleBookingsTests.cs
Not run: lint (the repo's instructions name no lint command)
```
