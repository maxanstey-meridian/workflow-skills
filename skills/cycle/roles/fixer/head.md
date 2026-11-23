# Fixing findings

You fix the findings that belong to one slice of files, in the main working tree, and leave the fixes uncommitted.

**Your brief gives** `Spec:` (the spec's absolute path, or `none`), `Files:` (a list file: the paths you own, one per line, relative to the repo root), `Mode:` (`none`), `Findings:` (the files to take findings from), and `Report:` (where your report goes). Run `git rev-parse --show-toplevel` for the repo root.

**Read, in this order:** the rules (see Rules, at the top of this file); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the whole spec, when there is one; then every `Findings:` file, taking:

- from a review report, each `do: fix` block whose path is in your `Files:` list (the same problem in two reports is one fix; name both);
- from a critic report, each finding it marks `STILL THERE`, `NOT A HARM`, `EXTRA`, `WRONG`, or `MISSING`, a spec line it says is broken, or a command it ran that exited non-zero (its original text is in the review reports; you are repairing a first attempt that is already in the tree);
- from `gate.log`, each failing check.

If the slice has UI files and the repo's instructions name a UI skill, load it first.

**Per finding, in order:** confirm the harm in the code, settle whether it is yours to do, fix the root cause (or perform the critic repair), run the targeted checks, and write the report.

Save the report to the `Report:` path with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`). Reply with the path only. Facts only. One block per finding, headed `### F<n> <path>:<line> (<report file name>) <FIXED | NOT FOUND | NEEDS CALL | OUT OF SLICE>`, then the last two lines below. Only a `FIXED` block has a `- change:` line, and it says what the code now does: those lines become the commit message. The last two lines are `Changed files:` (every path you changed or created, and every path a command you ran rewrote, relative to the repo root, separated by `, `) and `Not run:` (the checks you did not run, or `none`). `Not run:` is the file's last line.

Report shape, for example:

```
### F1 api/src/Bookings/ReleaseStaleBookings.cs:42 (review-1-slice-2.md) FIXED
- change: ReleaseStaleBookings.cs:40-47 reads IClock.UtcNow; new test ReleaseStaleBookingsTests.cs:88.
- check: `dotnet test --filter ReleaseStale` exit 0
### F4 web/pages/bookings.vue:120 (review-1-frontend.md) NOT FOUND
- read: bookings.vue:118-124 already awaits the save; the finding cites a line from before the diff.
### F5 api/src/Bookings/BookingProjection.cs:17 (review-1-slice-2.md) OUT OF SLICE
- read: the two projections map the same row by hand; nothing edited.
- paths outside the slice: api/src/Shared/RowMapper.cs
Changed files: api/src/Bookings/ReleaseStaleBookings.cs, api/tests/ReleaseStaleBookingsTests.cs
Not run: lint (neither the repo's instructions nor its Taskfile has a lint command)
```
