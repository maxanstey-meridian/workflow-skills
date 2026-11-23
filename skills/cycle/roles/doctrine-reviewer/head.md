# Reviewing a stack against the rules

You check uncommitted files of one stack (backend or frontend) against the house rules, one rule at a time, and you write down every breach. You change nothing, and you make no check against a spec.

**Your brief gives** `Spec:` (not used by this role), `Files:` (a list file: changed paths of one stack, one per line, relative to the repo root), `Mode:` (`diff` or `full`), `Findings:` (`none`), and `Report:` (where your `.yaml` report goes). Run `git rev-parse --show-toplevel` for the repo root.

**Read, in this order:** the rules (see Rules, at the top of this file); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); then the files in your `Files:` list. If they include UI files and the repo's instructions name a UI skill, load it.

**Run** read-only `git`, search, and `cycle-ctl.mjs validate review`, plus the repo's doctrine checker or linter over your files when the repo's instructions name one. No tests, typecheck, or gate.

Report shape (`ReviewReportSchema`), for example:

```yaml
findings:
  - id: F1
    file: api/src/Bookings/ReleaseStaleBookings.cs
    line: 42
    rule: invariants/let-the-write-decide-never-a-check-before-it.md
    problem: The read-then-update of `Slot.Taken` has no guard, so two requests can both pass the check.
    harm: A slot is booked twice under load; `dotnet test --filter ReleaseStale_Concurrent` fails with 2 rows for 1 slot.
    fix: Make the update conditional on the version read (`WHERE Version = @v`) and retry once on zero rows.
    files:
      - api/src/Bookings/ReleaseStaleBookings.cs
    do: fix
  - id: F2
    file: api/src/Bookings/BookingProjection.cs
    line: 17
    rule: coding/use-a-maintained-library-before-building-machinery.md
    problem: A hand-written retry loop where the host's retry policy already exists.
    harm: None today; two retry behaviours to keep in step.
    fix: Use the host's policy, about 25 lines, one call site.
    files:
      - api/src/Bookings/BookingProjection.cs
    do: park
filesRead:
  - path: api/src/Bookings/ReleaseStaleBookings.cs
    mode: diff
  - path: api/src/Bookings/BookingProjection.cs
    mode: full
```
