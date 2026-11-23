## Settle verdicts, duplicates, and missing coverage

**Law:** Drop every finding and `Cleanup` line a verifier dropped, append verifier counter-cases to `Against:`, mark findings absent from their `verify-` file `(unverified)`, merge duplicates across reports and attach hunter notes on design findings, mark code findings inside a design finding's capability `moot if D<n> lands`, add verifier-raised leads marked `(raised by the verifier)`, and report every coverage gap on `Findings`.

**When:** Settling hunter, design-reader, and verifier outputs in the reporter pass; coverage gaps to report on `Findings` are an area in `areas.md` with no `report-` file, no `report-design.md` when `areas.md` has more than one area (excluding `-rest` areas), a hunter report whose last line does not start with `Not read in full:` (cut short), a report with no `verify-` file, and every path on a `Not read in full:` last line except paths listed in a `-rest` area in `areas.md`.

Bad: Silently dropping a finding whose `verify-` file omitted it, or omitting an area that had no `report-` file from `Findings`.
Good: Marking the unmentioned finding `(unverified)`, attaching the hunter's `D1 · priced` note to `D1`, and listing the missing area report as item 1 under `Findings`.
