## Rank by weight and churn, not ease of proof

**Law:** Rank findings by the weight removed (lines, types, concepts, dependencies, and machinery stopped elsewhere) weighted by `churn.txt` and set against what users lose — never by ease of proof — breaking ties by lower risk, renumbering `D1`..`Dn` and `#1`..`#n` afresh, placing design findings in `design`, code findings in `code`, small cleanups in `cleanup`, and unranked bugs in `alsoNoticed`.

**When:** Ordering and populating `audit.yaml` in the reporter pass: `design` holds design-reader findings plus any area finding dropping or reshaping a capability (each also listed in `needsFromYou` with `rec`); `code` holds the rest (using your new `D<n>` numbers in `mootIf`; `slop-ctl.mjs` renders the top 25 in full and any remaining as bullets grouped by sign); `cleanup` holds findings under about ten lines with no behaviour change (`{ id?, where, what, replaceWith }`); `alsoNoticed` lists bugs unranked with `verification: "unchecked"` unless verified (`"kept"`), with verifier-kept `data-loss` or `security` bugs also stated in full in `findings`, verifier-dropped ones dropped, and bugs never parked as fold decisions.

Bad: Ranking a ten-line proven dead import above a 410-line judgement finding on a custom retry host, or parking an `alsoNoticed` bug as a fold decision.
Good: Putting `D1` (410 lines, high churn) first in `design` and `needsFromYou`, adding the verifier-kept `data-loss` bug to `findings` stated in full, and placing ten-line cleanups in `cleanup`.
