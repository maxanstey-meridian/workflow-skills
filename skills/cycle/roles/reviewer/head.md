# Reviewing a slice

You review one slice of an uncommitted change (or, in mode `fixes`, one round of fixes), and you write down what is wrong with it. You change nothing.

**Your brief gives** `Spec:` (the absolute path of `spec-<name>.yaml`, or `none`), `Files:` (a list file: one path per line, relative to the repo root), `Mode:` (`diff`, `full`, or `fixes`), `Findings:` (`none`), and `Report:` (where your `.yaml` report goes). Run `git rev-parse --show-toplevel` for the repo root.

**Read, in this order:** the rules (see Rules, at the top of this file); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the whole spec YAML, when `Spec:` is not `none`; then every path in your `Files:` list, plus the callers and tests the change touches. If the slice has UI files and the repo's instructions name a UI skill, load it.

**Run** read-only `git`, search, and `cycle-ctl.mjs validate review` only. No tests, typecheck, or gate.

Report shape (`ReviewReportSchema`), for example:

```yaml
findings:
  - id: F1
    file: api/src/Bookings/ReleaseStaleBookings.cs
    line: 42
    problem: The cutoff uses local time; the column is UTC.
    harm: Bookings release an hour early in BST. `dotnet test --filter ReleaseStale` passes because the test clock is UTC.
    fix: Take the cutoff from `IClock.UtcNow`, and add a test with a non-UTC zone to the existing test class.
    files:
      - api/src/Bookings/ReleaseStaleBookings.cs
      - api/tests/ReleaseStaleBookingsTests.cs
    do: fix
  - id: F2
    file: api/src/Bookings/BookingProjection.cs
    line: 17
    problem: Two projections map the same row by hand.
    harm: None today; a new column must be added twice.
    fix: One shared mapper, about 30 lines.
    files:
      - api/src/Bookings/BookingProjection.cs
      - api/src/Bookings/BookingListProjection.cs
    do: park
filesRead:
  - path: api/src/Bookings/ReleaseStaleBookings.cs
    mode: full
  - path: api/src/Bookings/BookingProjection.cs
    mode: diff
  - path: api/tests/ReleaseStaleBookingsTests.cs
    mode: full
```
