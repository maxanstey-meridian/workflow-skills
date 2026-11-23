## Rank by weight and churn, not ease of proof

**Law:** Rank findings by the weight removed (lines, types, concepts, dependencies, and machinery stopped elsewhere) weighted by `churn.txt` and set against what users lose — never by ease of proof — breaking ties by lower risk, renumbering `D1`..`Dn` and `#1`..`#n` afresh, with `## Design` first, `## Code` next, `## Cleanup` as bullets, and `## Also noticed` bugs unranked.

**When:** Ordering and formatting the final report in the reporter pass: `## Design` holds design-reader findings plus any area finding dropping or reshaping a capability (each also listed in `## Needs from you` with a recommendation); `## Code` holds the rest (top 25 in full separated by blank lines, the rest as `- ` bullets grouped by sign, and `moot if D<n> lands` using your new numbers); `## Cleanup` holds findings under about ten lines with no behaviour change as ``- #N `file:line` — what`` bullets; `## Also noticed` lists bugs unranked, marked `(unchecked)` unless verified, with verifier-kept `data loss` or `security` bugs moved to `## Findings` stated in full, verifier-dropped ones dropped, and bugs never parked as fold decisions.

Bad: Ranking a ten-line proven dead import above a 410-line judgement finding on a custom retry host, or parking an Also-noticed bug as a fold decision.
Good: Putting `D1` (410 lines, high churn) first under `## Design` and in `## Needs from you`, moving the verifier-kept `data loss` bug to `## Findings`, and listing ten-line cleanups as ``- #N `file:line` — what`` bullets under `## Cleanup`.
