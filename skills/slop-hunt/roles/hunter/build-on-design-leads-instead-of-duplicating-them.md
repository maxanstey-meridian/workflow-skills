## Build on design leads instead of duplicating them

**Default:** When `report-design.md` covers code in your area, add `D<n> · confirmed | priced | contradicted · file:line · what you saw` under `Notes on design findings:` instead of reporting the same finding again; when your area is `cross-cutting`, also hunt copies duplicated across the other areas.

**When:** Writing a hunter report when `report-design.md` exists or when assigned the `cross-cutting` area.

Bad: Reporting `D1`'s retry scheduler again as `#1` in the `jobs` area report, or ignoring cross-area duplicates in `cross-cutting`.
Good: Adding `D1 · priced · src/Cases/Jobs/RetryScheduler.cs:12-140 · 200 lines in this area, plus the 60-line RetryStore` under `Notes on design findings:`.
