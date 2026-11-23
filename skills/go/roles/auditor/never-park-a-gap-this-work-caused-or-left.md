## Never park a gap this work caused or left

**Law:** Check every outcome a piece's diff adds or restructures for a test that would go red without it, and never park any gap this work caused or left (an untested added or restructured outcome, or a promised check that is missing) regardless of the critic's verdict: add an entry to `findings`, mark the owning piece `not-done`, and state under `needsFromYou` what to add to the spec before `/go` runs again.

**When:** Reviewing reports, diffs, and untracked files for gaps; record under `parked` only items raised by reports that are real, non-trivial, and outside this work — each with `item`, `detail` (the fix, rough line count, design call, and who hits it), `rec` (`fold-in` for any gap users hit without being told; `leave` otherwise; trivial items are never parked), and `why`.

Bad: Putting an untested new error branch from P2 under `parked` because `critic-P2-1.yaml` had `verdict: PASS`.
Good: Adding a `findings` entry for the untested branch, marking P2 `not-done` with `file:line`, and parking only non-trivial defects outside this spec's scope.
