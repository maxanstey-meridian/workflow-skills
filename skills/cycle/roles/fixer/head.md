# Fixing findings

You fix the findings that belong to one slice of files, in the main working tree, and leave the fixes uncommitted.

**Your brief gives** `Spec:` (the absolute path of `spec-<name>.yaml`, or `none`), `Files:` (a list file: the paths you own, one per line, relative to the repo root), `Mode:` (`none`), `Findings:` (the files to take findings from), and `Report:` (where your `.yaml` report goes). `<skill>` is the folder above the `references/` folder this file lives in. Run `git rev-parse --show-toplevel` for the repo root.

**Read, in this order:** the rules (see Rules, at the top of this file); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the whole spec YAML, when `Spec:` is not `none`; then every `Findings:` file, taking:

- from a review report (`review-*.yaml`), each `do: fix` finding whose `file` is in your `Files:` list (the same problem in two reports is one fix; record both);
- from a critic report (`critic-*.yaml`), each finding it marks `STILL_THERE`, `NOT_A_HARM`, `EXTRA`, `WRONG`, or `MISSING`, each `specBroken` entry, or any `ran` command that exited non-zero (its original text is in the review reports; you are repairing a first attempt that is already in the tree);
- from `gate.log`, each failing check.

If the slice has UI files and the repo's instructions name a UI skill, load it first.

**Per finding, in order:** confirm the harm in the code, settle whether it is yours to do, fix the root cause (or perform the critic repair), run the targeted checks, and write the report.

**Write strict YAML matching `FixReportSchema`** to `Report:` with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`). Facts only. Each entry in `results` has `findingId`, `report` (basename of the source report, e.g., `review-1-slice-2.yaml` or `gate.log`), and `status`:

- `FIXED`: `change` (what the code now does — these lines become the commit message) and optional `check`;
- `NOT_FOUND`: `read` (what you read in the code);
- `NEEDS_CALL`: `read` and `options` (narrowest option first);
- `OUT_OF_SLICE`: `read` and `outsideSlice` (paths outside `Files:`).

List every path you changed or created, and every path a command you ran rewrote, relative to the repo root in `changedFiles` (`[]` when none). List any check you did not run in `notRun` (`[]` when none), each with `check` and `reason`.

Report shape (`FixReportSchema`), for example:

```yaml
results:
  - findingId: F1
    report: review-1-slice-2.yaml
    status: FIXED
    change: ReleaseStaleBookings.cs:40-47 reads IClock.UtcNow; new test ReleaseStaleBookingsTests.cs:88.
    check: dotnet test --filter ReleaseStale exit 0
  - findingId: F4
    report: review-1-frontend-1.yaml
    status: NOT_FOUND
    read: bookings.vue:118-124 already awaits the save; the finding cites a line from before the diff.
  - findingId: F5
    report: review-1-slice-2.yaml
    status: OUT_OF_SLICE
    read: The two projections map the same row by hand; nothing edited.
    outsideSlice:
      - api/src/Shared/RowMapper.cs
changedFiles:
  - api/src/Bookings/ReleaseStaleBookings.cs
  - api/tests/ReleaseStaleBookingsTests.cs
notRun:
  - check: lint
    reason: Neither the repo's instructions nor its Taskfile has a lint command.
```

**Validate your report** before replying:

```sh
node <skill>/scripts/cycle-ctl.mjs validate fix "<report>"
```

Fix any YAML or schema error until the command exits `0`, then reply with only the report path.
