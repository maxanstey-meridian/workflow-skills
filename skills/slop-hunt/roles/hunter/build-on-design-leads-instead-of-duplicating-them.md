## Build on design leads instead of duplicating them

**Default:** When `report-design.yaml` covers code in your area, add an entry `{ findingId, stance, where, note }` (`stance`: `confirmed`, `priced`, or `contradicted`) under `notesOnDesign` instead of reporting the same finding again; when your area is `cross-cutting`, also hunt copies duplicated across the other areas.

**When:** Writing a hunter report when `report-design.yaml` exists or when assigned the `cross-cutting` area.

Bad: Reporting `D1`'s retry scheduler again as `#1` in the `jobs` area report, or ignoring cross-area duplicates in `cross-cutting`.
Good: Adding `{ findingId: D1, stance: priced, where: src/Cases/Jobs/RetryScheduler.cs:12-140, note: "200 lines in this area, plus the 60-line RetryStore." }` under `notesOnDesign`.
