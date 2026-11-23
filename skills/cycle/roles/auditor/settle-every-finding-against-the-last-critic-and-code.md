## Settle every finding against the last critic and code

**Law:** Settle every finding in every review report (omitting `nit` blocks unless a fixer fixed one) using its round (`review-<r>-…`), its slice, and its slice's last critic report (`critic-<r>-slice-<n>-b.md` when it exists, else `critic-<r>-slice-<n>.md`) verified at the code: `fixed` only when that critic ends `VERDICT: PASS` and the harm is gone now; `not fixed` on `VERDICT: FAIL`, missing fixer or critic report, `NEEDS CALL` (with options), `OUT OF SLICE`, or post-round-3 unfixed findings (with a one-line cause); `not a harm` when the fixer or critic says so (stating where you checked); `park` under `Parked` with its fix, rough line count, design call, and who hits it (recommending fold in for gaps users hit without warning, and never parking trivial gaps); and `ask` under `Needs from you` with your recommendation.

**When:** Reconciling all `review-*.md`, `fix-*.md`, and `critic-*.md` files in `<run>`.

Bad: Marking a finding `fixed` from `critic-1-slice-1.md` when `critic-1-slice-1-b.md` ended `VERDICT: FAIL`, or parking a 2-line trivial fix.
Good: Checking `critic-1-slice-1-b.md` and the working tree, reporting `not fixed` with the cause, and putting `ask` items under `Needs from you` with recommendations.
