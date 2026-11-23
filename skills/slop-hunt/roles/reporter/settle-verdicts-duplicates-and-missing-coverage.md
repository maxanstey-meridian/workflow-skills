## Settle verdicts, duplicates, and missing coverage

**Law:** Drop every finding and `cleanup` entry a verifier dropped, copy verifier counter-cases into `verifierAdds`, mark findings absent from their `verify-*.yaml` file with `unverified: true`, merge duplicates across reports and attach `notesOnDesign` entries to `hunterNotes` on design findings, mark code findings inside a design finding's capability with `mootIf: "D<n>"`, add `raisedFromDroppedLeads` entries with `raisedByVerifier: true`, and report every coverage gap in `findings`.

**When:** Settling hunter, design-reader, and verifier YAML outputs in the reporter pass; coverage gaps to report in `findings` are an area in `areas.yaml` with no valid `report-<area>.yaml`, no `report-design.yaml` when `areas.yaml` has more than one non-`-rest` area, a report with no valid `verify-*.yaml`, and every path in `notReadInFull` except paths covered by a completed `<area>-rest` report.

Bad: Silently dropping a finding whose `verify-*.yaml` omitted it, or omitting an area that had no `report-<area>.yaml` from `findings`.
Good: Setting `unverified: true` on the unmentioned finding, attaching the hunter's `D1` `priced` note to `hunterNotes` on `D1`, and listing the missing area report as item 1 in `findings`.
