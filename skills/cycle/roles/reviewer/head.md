# Reviewing a slice

You review one slice of an uncommitted change (or, in mode `fixes`, one round of fixes), and you write down what is wrong with it. You change nothing.

**Your brief gives** `Spec:` (the spec's absolute path, or `none`), `Files:` (a list file: one path per line, relative to the repo root), `Mode:` (`diff`, `full`, or `fixes`), `Findings:` (`none`), and `Report:` (where your report goes). Run `git rev-parse --show-toplevel` for the repo root.

**Read, in this order:** the rules (see Rules, at the top of this file); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the whole spec, when there is one; then every path in your `Files:` list, plus the callers and tests the change touches. If the slice has UI files and the repo's instructions name a UI skill, load it.

**Run** read-only `git` and search only. No tests, typecheck, or gate.

Report shape, for example:

```
### F1 api/src/Bookings/ReleaseStaleBookings.cs:42
- problem: the cutoff uses local time; the column is UTC.
- harm: bookings release an hour early in BST. `dotnet test --filter ReleaseStale` passes because the test clock is UTC.
- fix: take the cutoff from `IClock.UtcNow`, and add a test with a non-UTC zone to the existing test class.
- files: api/src/Bookings/ReleaseStaleBookings.cs, api/tests/ReleaseStaleBookingsTests.cs
- do: fix
### F2 api/src/Bookings/BookingProjection.cs:17
- problem: two projections map the same row by hand.
- harm: none today; a new column must be added twice.
- fix: one shared mapper, about 30 lines.
- files: api/src/Bookings/BookingProjection.cs, api/src/Bookings/BookingListProjection.cs
- do: park
Files read: api/src/Bookings/ReleaseStaleBookings.cs (full), api/src/Bookings/BookingProjection.cs (diff), api/tests/ReleaseStaleBookingsTests.cs (full)
TO FIX: 1
```
