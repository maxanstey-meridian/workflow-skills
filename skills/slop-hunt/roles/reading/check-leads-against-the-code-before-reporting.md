## Check leads against the code before reporting

**Law:** Treat every `knip`, `jscpd`, analyzer, and `report-design.yaml` entry as a lead to read — never a finding until checked against the code — and when a design lead covers code in your hunter area, add what you see to `notesOnDesign` (`confirmed`, `priced`, or `contradicted`, citing `where`) rather than reporting the same thing again.

**When:** Working through mechanical finder outputs (`leads-*.txt`) and `report-design.yaml` in a hunter pass.

Bad: Copying a `knip` unused-file line straight into findings without checking Nuxt auto-imports, or duplicating `D1` as `#1`.
Good: Reading the file first, dropping false leads under `leadsDropped`, and recording `{ findingId: D1, stance: priced, where: src/Cases/Jobs/RetryScheduler.cs:12-140, note: "..." }` under `notesOnDesign`.
